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
      .select('output_file_path, user_id')
      .eq('id', jobId)
      .single()

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
    const { data, error: urlError } = await supabase
      .storage
      .from('job-files')
      .createSignedUrl(job.output_file_path, 3600) // 1 hour expiry

    if (urlError || !data) {
      return NextResponse.json({ 
        error: 'Failed to create download URL', 
        details: urlError?.message,
        path: job.output_file_path,
        bucket: 'job-files'
      }, { status: 500 })
    }

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