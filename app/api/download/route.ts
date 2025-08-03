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

    console.log('Fetching job data for download:', jobId)

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

    // Generate CSV from output data
    const { headers, rows, filename } = job.output_data
    const csvLines = [
      headers.join(','),
      ...rows.map((row: any) => 
        headers.map((header: string) => {
          const value = row[header] || ''
          // Escape quotes and wrap in quotes if contains comma or quotes
          const escaped = String(value).replace(/"/g, '""')
          return escaped.includes(',') || escaped.includes('"') ? `"${escaped}"` : escaped
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