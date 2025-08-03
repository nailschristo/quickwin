import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const jobId = searchParams.get('jobId')
    
    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId parameter' }, { status: 400 })
    }

    // Import and create Supabase client
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Authentication error in download:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Fetching job data for download:', jobId, 'User:', user.id)

    // Get the job with output file path
    const { data: job, error } = await supabase
      .from('jobs')
      .select('output_file_path, output_data, user_id')
      .eq('id', jobId)
      .single()

    if (error || !job) {
      console.error('Job not found:', error)
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Verify user owns this job
    if (job.user_id !== user.id) {
      console.error('User does not own job:', { jobUser: job.user_id, requestUser: user.id })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
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
      console.error('Failed to download file from storage:', downloadError)
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
    }

    // Get the filename from the path or output_data
    let filename = 'download.csv'
    if (job.output_file_path) {
      const parts = job.output_file_path.split('/')
      filename = parts[parts.length - 1]
    } else if (job.output_data && job.output_data.filename) {
      filename = job.output_data.filename
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
    return NextResponse.json({ error: 'Download failed' }, { status: 500 })
  }
}