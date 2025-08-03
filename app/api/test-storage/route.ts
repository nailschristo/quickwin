import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Create admin client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false
      }
    })

    // Test upload
    const testContent = 'Hello, this is a test file'
    const testPath = 'test/test-file.txt'
    
    const { data, error } = await supabase
      .storage
      .from('job-files')
      .upload(testPath, testContent, {
        contentType: 'text/plain',
        upsert: true
      })

    if (error) {
      return NextResponse.json({ 
        error: 'Upload failed', 
        details: error,
        bucket: 'job-files',
        path: testPath
      }, { status: 500 })
    }

    // Try to download it back
    const { data: downloadData, error: downloadError } = await supabase
      .storage
      .from('job-files')
      .download(testPath)

    if (downloadError) {
      return NextResponse.json({ 
        upload: 'success',
        download: 'failed',
        downloadError
      })
    }

    return NextResponse.json({ 
      success: true,
      uploaded: data,
      path: testPath,
      downloadable: !!downloadData
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}