import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function processCSVFile(fileId: string, jobId: string, supabase: any) {
  // Get file record
  const { data: file } = await supabase
    .from('job_files')
    .select('*')
    .eq('id', fileId)
    .single()

  if (!file) {
    throw new Error('File not found')
  }

  // Download file from storage
  const urlParts = file.file_url.split('/')
  const fileName = urlParts[urlParts.length - 1]
  const path = `${jobId}/${fileName}`
  
  const { data: fileData, error: downloadError } = await supabase
    .storage
    .from('job-files')
    .download(path)

  if (downloadError) {
    throw new Error(`Failed to download file: ${downloadError.message}`)
  }

  // Process CSV file
  const text = await fileData.text()
  const lines = text.split('\n').filter(line => line.trim())
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty')
  }

  // Parse CSV headers
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  
  // Parse sample rows (up to 10)
  const sampleRows: Record<string, any>[] = []
  for (let i = 1; i < Math.min(11, lines.length); i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row: Record<string, any> = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] || ''
    })
    sampleRows.push(row)
  }

  // Detect column types
  const columns = headers.map(header => {
    const values = sampleRows.map(row => row[header]).filter(v => v)
    const sampleValues = values.slice(0, 5)
    
    // Simple type detection
    let type = 'text'
    if (values.every(v => !isNaN(Number(v)) && v !== '')) {
      type = 'number'
    } else if (values.every(v => v === 'true' || v === 'false' || v === '')) {
      type = 'boolean'
    }
    
    return {
      name: header,
      type,
      sample_values: sampleValues,
      non_null_count: values.length,
      null_count: sampleRows.length - values.length
    }
  })

  // Prepare processed data
  const processedData = {
    columns,
    row_count: lines.length - 1,
    preview_data: sampleRows
  }

  // Update file record with processed data
  const { error: updateError } = await supabase
    .from('job_files')
    .update({
      processed_data: processedData,
      raw_data: {
        columns: headers,
        shape: [lines.length - 1, headers.length],
        dtypes: Object.fromEntries(columns.map(c => [c.name, c.type]))
      }
    })
    .eq('id', fileId)

  if (updateError) {
    throw new Error(`Failed to update file: ${updateError.message}`)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id

    // Verify user is authenticated
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get job and verify ownership
    const { data: job } = await supabase
      .from('jobs')
      .select('*, job_files(*)')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found or unauthorized' },
        { status: 404 }
      )
    }

    // Update job status to processing
    await supabase
      .from('jobs')
      .update({ status: 'processing' })
      .eq('id', jobId)

    // Process each file based on its type
    const processingPromises = job.job_files.map(async (file: any) => {
      const fileExtension = file.file_name.split('.').pop()?.toLowerCase()
      
      // For now, only process CSV files
      if (fileExtension === 'csv') {
        // Process the CSV file directly
        await processCSVFile(file.id, jobId, supabase)
      } else {
        console.log(`Skipping unsupported file type: ${fileExtension} for file: ${file.file_name}`)
      }
    })

    // Wait for all files to be processed
    try {
      await Promise.all(processingPromises)
      
      // Update job status to completed
      await supabase
        .from('jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)
      
      return NextResponse.json({
        success: true,
        message: 'All files processed successfully'
      })
    } catch (error: any) {
      // Some files failed to process
      await supabase
        .from('jobs')
        .update({ status: 'failed' })
        .eq('id', jobId)
      
      throw error
    }

  } catch (error: any) {
    console.error('Job processing error:', error)
    
    return NextResponse.json(
      { error: error.message || 'Failed to process job' },
      { status: 500 }
    )
  }
}