import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

// Test handler to verify route is accessible
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Process job endpoint is working',
    method: 'GET',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobId } = body

    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing jobId in request body' },
        { status: 400 }
      )
    }

    console.log('Process job API called with jobId:', jobId)

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

    // Process each CSV file
    for (const file of job.job_files) {
      const fileExtension = file.file_name.split('.').pop()?.toLowerCase()
      
      if (fileExtension === 'csv') {
        // Get file from storage
        const urlParts = file.file_url.split('/')
        const fileName = urlParts[urlParts.length - 1]
        const path = `${jobId}/${fileName}`
        
        const { data: fileData, error: downloadError } = await supabase
          .storage
          .from('job-files')
          .download(path)

        if (downloadError) {
          console.error(`Failed to download file: ${downloadError.message}`)
          continue
        }

        // Process CSV
        const text = await fileData.text()
        const lines = text.split('\n').filter((line: string) => line.trim())
        
        if (lines.length === 0) continue

        const headers = lines[0].split(',').map((h: string) => h.trim().replace(/^"|"$/g, ''))
        
        // Parse sample rows
        const sampleRows: Record<string, any>[] = []
        for (let i = 1; i < Math.min(11, lines.length); i++) {
          const values = lines[i].split(',').map((v: string) => v.trim().replace(/^"|"$/g, ''))
          const row: Record<string, any> = {}
          headers.forEach((header: string, idx: number) => {
            row[header] = values[idx] || ''
          })
          sampleRows.push(row)
        }

        // Detect column types
        const columns = headers.map((header: string) => {
          const values = sampleRows.map((row: any) => row[header]).filter((v: any) => v)
          const sampleValues = values.slice(0, 5)
          
          let type = 'text'
          if (values.every((v: any) => !isNaN(Number(v)) && v !== '')) {
            type = 'number'
          } else if (values.every((v: any) => v === 'true' || v === 'false' || v === '')) {
            type = 'boolean'
          }
          
          return {
            name: header,
            type,
            sample_values: sampleValues,
            non_null_count: values.length,
            null_count: sampleRows.length - values.length
          }
        })

        // Update file record
        await supabase
          .from('job_files')
          .update({
            processed_data: {
              columns,
              row_count: lines.length - 1,
              preview_data: sampleRows
            },
            raw_data: {
              columns: headers,
              shape: [lines.length - 1, headers.length],
              dtypes: Object.fromEntries(columns.map((c: any) => [c.name, c.type]))
            }
          })
          .eq('id', file.id)
      }
    }

    // Update job status to completed
    await supabase
      .from('jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId)
    
    return NextResponse.json({
      success: true,
      message: 'All files processed successfully'
    })

  } catch (error: any) {
    console.error('Job processing error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process job' },
      { status: 500 }
    )
  }
}