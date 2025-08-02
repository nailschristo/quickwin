import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json()
    const { fileId, jobId } = body

    if (!fileId || !jobId) {
      return NextResponse.json(
        { error: 'Missing fileId or jobId' },
        { status: 400 }
      )
    }

    // Verify user is authenticated
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user owns this job
    const { data: job } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found or unauthorized' },
        { status: 404 }
      )
    }

    // Get file record
    const { data: file } = await supabase
      .from('job_files')
      .select('*')
      .eq('id', fileId)
      .single()

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Update job status to processing
    await supabase
      .from('jobs')
      .update({ status: 'processing' })
      .eq('id', jobId)

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('job-files')
      .download(file.file_url.split('job-files/')[1])

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`)
    }

    // Process CSV file
    const text = await fileData.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    if (lines.length === 0) {
      throw new Error('CSV file is empty')
    }

    // Parse CSV headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    
    // Parse sample rows (up to 10)
    const sampleRows: Record<string, any>[] = []
    for (let i = 1; i < Math.min(11, lines.length); i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const row: Record<string, any> = {}
      headers.forEach((header, idx) => {
        row[header] = values[idx] || ''
      })
      sampleRows.push(row)
    }

    // Detect column types
    const columns = headers.map(header => {
      const values = sampleRows.map(row => row[header]).filter(v => v)
      const sampleValues = values.slice(0, 5)
      
      // Simple type detection
      let type = 'text'
      if (values.every(v => !isNaN(Number(v)) && v !== '')) {
        type = 'number'
      } else if (values.every(v => v === 'true' || v === 'false' || v === '')) {
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

    // Prepare processed data
    const processedData = {
      columns,
      row_count: lines.length - 1,
      preview_data: sampleRows
    }

    // Update file record with processed data
    const { error: updateError } = await supabase
      .from('job_files')
      .update({
        processed_data: processedData,
        raw_data: {
          columns: headers,
          shape: [lines.length - 1, headers.length],
          dtypes: Object.fromEntries(columns.map(c => [c.name, c.type]))
        }
      })
      .eq('id', fileId)

    if (updateError) {
      throw new Error(`Failed to update file: ${updateError.message}`)
    }

    // Check if all files in job are processed
    const { data: allFiles } = await supabase
      .from('job_files')
      .select('processed_data')
      .eq('job_id', jobId)

    const allProcessed = allFiles?.every(f => f.processed_data !== null) ?? false

    if (allProcessed) {
      await supabase
        .from('jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)
    }

    return NextResponse.json({
      success: true,
      columns,
      row_count: lines.length - 1
    })

  } catch (error: any) {
    console.error('CSV processing error:', error)
    
    // Update job status to failed
    if (body?.jobId) {
      const supabase = await createClient()
      await supabase
        .from('jobs')
        .update({ status: 'failed' })
        .eq('id', body.jobId)
    }

    return NextResponse.json(
      { error: error.message || 'Failed to process CSV file' },
      { status: 500 }
    )
  }
}