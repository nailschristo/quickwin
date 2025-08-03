import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const jobId = searchParams.get('jobId')
    
    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId parameter' }, { status: 400 })
    }

    // Create Supabase client directly
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 })
    }
    
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey)

    // Get the job with output file path
    const { data: job, error } = await supabase
      .from('jobs')
      .select('output_file_path, output_data, user_id')
      .eq('id', jobId)
      .single()

    if (error || !job) {
      console.error('Job not found:', { error, jobId })
      return NextResponse.json({ error: 'Job not found', jobId }, { status: 404 })
    }

    // Check if we have a file path
    if (!job.output_file_path) {
      console.error('No output file path in job:', job)
      return NextResponse.json({ error: 'No output file available' }, { status: 404 })
    }

    console.log('Downloading file from storage:', job.output_file_path)

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('job-files')
      .download(job.output_file_path)

    if (downloadError || !fileData) {
      console.error('Failed to download file from storage:', {
        error: downloadError,
        path: job.output_file_path,
        bucket: 'job-files'
      })
      return NextResponse.json({ 
        error: 'Failed to download file from storage', 
        details: downloadError?.message || 'Unknown error',
        path: job.output_file_path 
      }, { status: 500 })
    }

    // Get the filename from the path
    let filename = 'download.csv'
    if (job.output_file_path) {
      const parts = job.output_file_path.split('/')
      filename = parts[parts.length - 1]
    }

    // Convert blob to text
    const csvContent = await fileData.text()

    // Return the CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('Download route error:', error)
    return NextResponse.json({ 
      error: 'Download failed', 
      message: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}