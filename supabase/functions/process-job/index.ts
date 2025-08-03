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

    console.log('Processing job with', job.job_files.length, 'files')
    console.log('Schema columns:', schemaColumns.map((c: any) => c.name))

    // Process each file
    for (const file of job.job_files) {
      console.log('Processing file:', file.file_name, 'ID:', file.id)
      
      if (!file.file_name.endsWith('.csv')) {
        console.log('Skipping non-CSV file:', file.file_name)
        continue
      }

      // Download file
      const path = `${jobId}/${file.file_name}`
      console.log('Downloading file from path:', path)
      
      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from('job-files')
        .download(path)

      if (downloadError || !fileData) {
        console.error('Download error for file:', path, downloadError)
        continue
      }

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
      console.log('CSV headers:', headers)
      console.log('CSV has', lines.length, 'total lines (including header)')
      
      // Get mappings for this file
      const fileMappings = job.column_mappings.filter((m: any) => m.file_id === file.id)
      console.log('Found', fileMappings.length, 'mappings for file:', file.id)
      console.log('Mappings:', fileMappings.map((m: any) => {
        const transformInfo = m.transformation_config ? ` [${m.transformation_config.type}]` : ''
        return `${m.source_column} -> ${m.target_column}${transformInfo}`
      }))
      
      // Process each data row
      for (let rowIdx = 1; rowIdx < lines.length; rowIdx++) {
        const values = parseCSVLine(lines[rowIdx])
        if (rowIdx === 1) {
          console.log('First row values:', values)
        }
        
        const sourceRow: Record<string, any> = {}
        headers.forEach((header: string, idx: number) => {
          sourceRow[header] = values[idx] || ''
        })

        // Create target row based on schema
        const targetRow: Record<string, any> = {}
        
        for (const schemaCol of schemaColumns) {
          const mapping = fileMappings.find((m: any) => m.target_column === schemaCol.name)
          
          if (mapping) {
            // Check if this mapping has a transformation
            if (mapping.transformation_config && mapping.transformation_config.type === 'split') {
              // Apply split transformation
              const sourceValue = sourceRow[mapping.source_column] || ''
              const config = mapping.transformation_config.config
              
              if (config && config.parts) {
                // Use the parts configuration to determine how to split
                const delimiter = config.delimiter || ' '
                const parts = config.trim ? sourceValue.trim().split(delimiter) : sourceValue.split(delimiter)
                
                // Find the part configuration for this target column
                const partConfig = config.parts.find((p: any) => p.targetColumn === schemaCol.name)
                
                if (partConfig) {
                  let index = partConfig.index
                  
                  // Handle negative indices (e.g., -1 for last element)
                  if (index < 0) {
                    index = parts.length + index
                  }
                  
                  targetRow[schemaCol.name] = parts[index] || partConfig.defaultValue || ''
                } else {
                  // No part config for this column, leave empty
                  targetRow[schemaCol.name] = ''
                }
              } else {
                // Fallback: simple split logic
                const parts = sourceValue.trim().split(/\s+/)
                if (schemaCol.name.toLowerCase().includes('first')) {
                  targetRow[schemaCol.name] = parts[0] || ''
                } else if (schemaCol.name.toLowerCase().includes('last')) {
                  targetRow[schemaCol.name] = parts.slice(1).join(' ') || ''
                }
              }
            } else {
              // Direct mapping - no transformation
              targetRow[schemaCol.name] = sourceRow[mapping.source_column] || ''
            }
          } else {
            targetRow[schemaCol.name] = ''
          }
        }
        
        if (rowIdx === 1) {
          console.log('First source row:', sourceRow)
          console.log('First target row:', targetRow)
          
          // Log transformation details for debugging
          for (const mapping of fileMappings) {
            if (mapping.transformation_config) {
              console.log('Transformation config for', mapping.source_column, '->', mapping.target_column, ':', 
                JSON.stringify(mapping.transformation_config, null, 2))
            }
          }
        }
        
        processedRows.push(targetRow)
      }
      
      console.log('Processed', processedRows.length, 'rows from file:', file.file_name)
    }
    
    console.log('Total processed rows:', processedRows.length)

    // Create output data structure
    const outputHeaders = schemaColumns.map((col: any) => col.name)
    const outputFilename = `${job.schemas.name}_merged_${new Date().toISOString().split('T')[0]}.csv`
    
    // Generate CSV content
    const csvLines = [
      outputHeaders.join(','),
      ...processedRows.map((row: any) => 
        outputHeaders.map((header: string) => {
          const value = row[header] || ''
          const escaped = String(value).replace(/"/g, '""')
          return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n') ? `"${escaped}"` : escaped
        }).join(',')
      )
    ]
    const csvContent = csvLines.join('\n')
    
    console.log('Generated CSV with', processedRows.length, 'rows')
    console.log('CSV preview (first 500 chars):', csvContent.substring(0, 500))
    console.log('CSV line count:', csvLines.length)
    
    // Upload CSV to storage
    const outputPath = `${jobId}/output/${outputFilename}`
    console.log('Uploading output file to:', outputPath)
    
    const { error: uploadError } = await supabase
      .storage
      .from('job-files')
      .upload(outputPath, csvContent, {
        contentType: 'text/csv',
        upsert: true
      })
    
    if (uploadError) {
      console.error('Failed to upload output file:', uploadError)
      throw uploadError
    }
    
    console.log('Output file uploaded successfully')
    
    // Update job status and store output data
    console.log('Updating job with output data')
    
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        output_data: {
          headers: outputHeaders,
          rows: processedRows,
          filename: outputFilename
        },
        output_file_path: outputPath,
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
        output_path: outputPath
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