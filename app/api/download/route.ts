import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const jobId = searchParams.get('jobId')
    
    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId parameter' }, { status: 400 })
    }

    // Create Supabase client
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the job with output file path
    const { data: job, error } = await supabase
      .from('jobs')
      .select('output_file_path, user_id')
      .eq('id', jobId)
      .single()

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Verify user owns this job
    if (job.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if we have a file path
    if (!job.output_file_path) {
      return NextResponse.json({ error: 'No output file available' }, { status: 404 })
    }

    // Create a signed URL for the file
    const { data, error: urlError } = await supabase
      .storage
      .from('job-files')
      .createSignedUrl(job.output_file_path, 60) // 60 seconds expiry

    if (urlError || !data) {
      return NextResponse.json({ 
        error: 'Failed to create download URL', 
        details: urlError?.message 
      }, { status: 500 })
    }

    // Return the signed URL
    return NextResponse.json({ url: data.signedUrl })
    
  } catch (error: any) {
    console.error('Download route error:', error)
    return NextResponse.json({ 
      error: 'Download failed', 
      message: error.message || 'Unknown error'
    }, { status: 500 })
  }
}