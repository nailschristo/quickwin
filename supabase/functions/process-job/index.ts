import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { jobId } = await req.json()

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'Missing jobId' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get job with files and mappings
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        job_files(*),
        column_mappings(*),
        schemas(*, schema_columns(*))
      `)
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      throw new Error('Job not found')
    }

    // Update job status
    await supabase
      .from('jobs')
      .update({ status: 'processing' })
      .eq('id', jobId)

    const processedRows: any[] = []
    const schemaColumns = job.schemas.schema_columns.sort((a: any, b: any) => a.position - b.position)

    // Process each file
    for (const file of job.job_files) {
      if (!file.file_name.endsWith('.csv')) continue

      // Download file
      const path = `${jobId}/${file.file_name}`
      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from('job-files')
        .download(path)

      if (downloadError || !fileData) continue

      // Process CSV
      const text = await fileData.text()
      const lines = text.split('\n').filter((line: string) => line.trim())
      
      if (lines.length <= 1) continue

      // Parse CSV properly (handle quoted values)
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = []
        let current = ''
        let inQuotes = false
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          const nextChar = line[i + 1]
          
          if (char === '"' && nextChar === '"' && inQuotes) {
            current += '"'
            i++ // Skip next quote
          } else if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        
        if (current) {
          result.push(current.trim())
        }
        
        return result
      }

      const headers = parseCSVLine(lines[0])
      
      // Get mappings for this file
      const fileMappings = job.column_mappings.filter((m: any) => m.job_file_id === file.id)
      
      // Process each data row
      for (let rowIdx = 1; rowIdx < lines.length; rowIdx++) {
        const values = parseCSVLine(lines[rowIdx])
        const sourceRow: Record<string, any> = {}
        headers.forEach((header: string, idx: number) => {
          sourceRow[header] = values[idx] || ''
        })

        // Create target row based on schema
        const targetRow: Record<string, any> = {}
        
        for (const schemaCol of schemaColumns) {
          const mapping = fileMappings.find((m: any) => m.target_column === schemaCol.name)
          
          if (mapping) {
            if (mapping.transformation_type === 'split' && mapping.source_columns[0].toLowerCase() === 'name') {
              // Apply name splitting
              const fullName = sourceRow[mapping.source_columns[0]] || ''
              const names = fullName.split(' ')
              if (schemaCol.name.toLowerCase().includes('first')) {
                targetRow[schemaCol.name] = names[0] || ''
              } else if (schemaCol.name.toLowerCase().includes('last')) {
                targetRow[schemaCol.name] = names.slice(1).join(' ') || ''
              }
            } else {
              // Direct mapping
              targetRow[schemaCol.name] = sourceRow[mapping.source_columns[0]] || ''
            }
          } else {
            targetRow[schemaCol.name] = ''
          }
        }
        
        processedRows.push(targetRow)
      }
    }

    // Create output data structure
    const outputHeaders = schemaColumns.map((col: any) => col.name)
    const outputData = {
      headers: outputHeaders,
      rows: processedRows,
      filename: `${job.schemas.name}_merged_${new Date().toISOString().split('T')[0]}.csv`
    }
    
    console.log('Processed rows count:', processedRows.length)
    console.log('Output data prepared')
    
    // Update job status and store output data
    console.log('Updating job with output data')
    
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        output_data: outputData,
        output_file_path: outputData.filename,
        metadata: {
          rows_processed: processedRows.length,
          files_processed: job.job_files.length
        }
      })
      .eq('id', jobId)
    
    if (updateError) {
      console.error('Job update error:', updateError)
      throw updateError
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        rows_processed: processedRows.length,
        output_path: outputData.filename
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('Processing error:', error)

    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})