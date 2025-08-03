import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  console.log('Download route called')
  
  try {
    const searchParams = request.nextUrl.searchParams
    const jobId = searchParams.get('jobId')
    console.log('Job ID:', jobId)
    
    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId parameter' }, { status: 400 })
    }

    // Create authenticated Supabase client
    const supabase = await createClient()
    
    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('User authenticated:', user.id)

    // Get the job with output file path - ensure user owns it
    console.log('Querying job:', jobId, 'for user:', user.id)
    const { data: job, error } = await supabase
      .from('jobs')
      .select('output_file_path, user_id')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()

    console.log('Job query result:', { job, error })

    if (error || !job) {
      return NextResponse.json({ 
        error: 'Job not found', 
        details: error?.message,
        jobId 
      }, { status: 404 })
    }

    // Check if we have a file path
    if (!job.output_file_path) {
      return NextResponse.json({ 
        error: 'No output file available',
        job: { id: jobId, output_file_path: job.output_file_path }
      }, { status: 404 })
    }

    // Create a signed URL for the file
    console.log('Creating signed URL for:', job.output_file_path)
    const { data, error: urlError } = await supabase
      .storage
      .from('job-files')
      .createSignedUrl(job.output_file_path, 3600) // 1 hour expiry

    if (urlError || !data) {
      console.error('Failed to create signed URL:', urlError)
      return NextResponse.json({ 
        error: 'Failed to create download URL', 
        details: urlError?.message,
        path: job.output_file_path,
        bucket: 'job-files'
      }, { status: 500 })
    }

    console.log('Signed URL created successfully')
    // Return the signed URL
    return NextResponse.json({ url: data.signedUrl })
    
  } catch (error: any) {
    console.error('Download route error:', error)
    return NextResponse.json({ 
      error: 'Download failed', 
      message: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}