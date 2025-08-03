import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const path = searchParams.get('path')
    
    if (!path) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 })
    }

    // Create Supabase client with service role key for private bucket access
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Download the file
    const { data, error } = await supabase
      .storage
      .from('job-files')
      .download(path)

    if (error) {
      console.error('Download error:', error)
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Get filename from path
    const filename = path.split('/').pop() || 'download.csv'

    // Return the file with appropriate headers
    return new NextResponse(data, {
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