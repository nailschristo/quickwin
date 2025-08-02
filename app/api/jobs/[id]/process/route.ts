import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
      
      let endpoint = ''
      switch (fileExtension) {
        case 'csv':
          endpoint = '/api/process/csv'
          break
        case 'xlsx':
        case 'xls':
          endpoint = '/api/process/excel'
          break
        case 'pdf':
          endpoint = '/api/process/pdf'
          break
        case 'png':
        case 'jpg':
        case 'jpeg':
          endpoint = '/api/process/image'
          break
        default:
          throw new Error(`Unsupported file type: ${fileExtension}`)
      }

      // Call the appropriate processing endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || ''
        },
        body: JSON.stringify({
          fileId: file.id,
          jobId: jobId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Failed to process ${file.file_name}`)
      }

      return response.json()
    })

    // Wait for all files to be processed
    try {
      await Promise.all(processingPromises)
      
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