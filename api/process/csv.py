import json
import pandas as pd
from supabase import create_client, Client
from io import StringIO
import os
from datetime import datetime

# Initialize Supabase client
supabase_url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

def detect_column_types(df):
    """Detect data types for each column"""
    column_info = {}
    
    for col in df.columns:
        # Get basic info
        dtype = str(df[col].dtype)
        non_null_count = df[col].notna().sum()
        null_count = df[col].isna().sum()
        
        # Get sample values (up to 10 non-null values)
        sample_values = df[col].dropna().head(10).tolist()
        
        # Try to infer more specific type
        inferred_type = 'text'
        if df[col].dtype in ['int64', 'float64']:
            inferred_type = 'number'
        elif df[col].dtype == 'bool':
            inferred_type = 'boolean'
        else:
            # Check if it might be a date
            try:
                pd.to_datetime(df[col].dropna().head(100), errors='coerce')
                if pd.to_datetime(df[col].dropna().head(100), errors='coerce').notna().sum() > 50:
                    inferred_type = 'date'
            except:
                pass
        
        column_info[col] = {
            'name': col,
            'type': inferred_type,
            'non_null_count': int(non_null_count),
            'null_count': int(null_count),
            'sample_values': sample_values[:5]  # Limit to 5 samples
        }
    
    return column_info

def handler(request):
    """Process CSV file and extract column information"""
    
    if request.method != 'POST':
        return {
            'statusCode': 405,
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    try:
        # Parse request body
        body = json.loads(request.body)
        file_id = body.get('file_id')
        job_id = body.get('job_id')
        
        if not file_id or not job_id:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Missing file_id or job_id'})
            }
        
        # Get file record from database
        file_result = supabase.table('job_files').select('*').eq('id', file_id).single().execute()
        file_data = file_result.data
        
        if not file_data:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'File not found'})
            }
        
        # Download file from Supabase Storage
        bucket_name = 'job-files'
        file_path = file_data['file_url'].split(f'{bucket_name}/')[1]
        file_content = supabase.storage.from_(bucket_name).download(file_path)
        
        # Read CSV file
        try:
            # Try to decode with UTF-8 first
            csv_string = file_content.decode('utf-8')
        except UnicodeDecodeError:
            # Fallback to latin-1 if UTF-8 fails
            csv_string = file_content.decode('latin-1')
        
        df = pd.read_csv(StringIO(csv_string))
        
        # Detect column information
        column_info = detect_column_types(df)
        
        # Prepare processed data
        processed_data = {
            'columns': list(column_info.values()),
            'row_count': len(df),
            'preview_data': df.head(10).to_dict('records')
        }
        
        # Update file record with processed data
        update_result = supabase.table('job_files').update({
            'processed_data': processed_data,
            'raw_data': {
                'columns': df.columns.tolist(),
                'shape': list(df.shape),
                'dtypes': {col: str(dtype) for col, dtype in df.dtypes.items()}
            }
        }).eq('id', file_id).execute()
        
        # Update job status
        # Check if all files in the job are processed
        all_files = supabase.table('job_files').select('processed_data').eq('job_id', job_id).execute()
        all_processed = all(file.get('processed_data') is not None for file in all_files.data)
        
        if all_processed:
            supabase.table('jobs').update({
                'status': 'completed',
                'completed_at': datetime.utcnow().isoformat()
            }).eq('id', job_id).execute()
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'success': True,
                'columns': list(column_info.values()),
                'row_count': len(df)
            })
        }
        
    except Exception as e:
        # Update job status to failed
        if 'job_id' in locals():
            supabase.table('jobs').update({
                'status': 'failed'
            }).eq('id', job_id).execute()
        
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }