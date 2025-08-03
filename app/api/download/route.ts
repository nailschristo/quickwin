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

    // Get the job with output data
    const { data: job, error } = await supabase
      .from('jobs')
      .select('output_data, output_file_path')
      .eq('id', jobId)
      .single()

    if (error || !job || !job.output_data) {
      console.error('Job not found or no output data:', error)
      return NextResponse.json({ error: 'No output data found' }, { status: 404 })
    }

    // Validate output data structure
    if (!job.output_data) {
      console.error('No output_data in job:', job)
      return NextResponse.json({ error: 'No output data in job' }, { status: 404 })
    }

    const { headers, rows, filename } = job.output_data as any

    if (!headers || !Array.isArray(headers)) {
      console.error('Invalid headers in output_data:', job.output_data)
      return NextResponse.json({ error: 'Invalid output data structure - missing headers' }, { status: 500 })
    }

    if (!rows || !Array.isArray(rows)) {
      console.error('Invalid rows in output_data:', job.output_data)
      return NextResponse.json({ error: 'Invalid output data structure - missing rows' }, { status: 500 })
    }

    // Generate CSV from output data
    const csvLines = [
      headers.join(','),
      ...rows.map((row: any) => 
        headers.map((header: string) => {
          const value = row[header] || ''
          // Escape quotes and wrap in quotes if contains comma or quotes
          const escaped = String(value).replace(/"/g, '""')
          return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n') ? `"${escaped}"` : escaped
        }).join(',')
      )
    ]
    const csvContent = csvLines.join('\n')

    // Return the CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename || 'download.csv'}"`,
      },
    })
  } catch (error: any) {
    console.error('Download route error:', error)
    return NextResponse.json({ error: 'Download failed' }, { status: 500 })
  }
}