import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const path = searchParams.get('path')
    
    if (!path) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 })
    }

    // Import and create Supabase client
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    console.log('Attempting to download file from path:', path)

    // Download the file
    const { data, error } = await supabase
      .storage
      .from('job-files')
      .download(path)

    if (error) {
      console.error('Download error:', error)
      console.error('Path attempted:', path)
      return NextResponse.json({ error: error.message || 'File not found' }, { status: 404 })
    }

    if (!data) {
      console.error('No data returned for path:', path)
      return NextResponse.json({ error: 'No file data' }, { status: 404 })
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