import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'
import { TransformationEngine } from '@/lib/transformations/engine'

export async function processJobClient(jobId: string, onProgress?: (percent: number) => void) {
  const supabase = createClient()
  
  try {
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
      throw new Error('Failed to load job')
    }

    onProgress?.(10)

    // Update job status
    await supabase
      .from('jobs')
      .update({ status: 'processing' })
      .eq('id', jobId)

    const allProcessedData: any[] = []
    const schemaColumns = job.schemas.schema_columns.sort((a: any, b: any) => a.order - b.order)

    // Process each file
    for (let i = 0; i < job.job_files.length; i++) {
      const file = job.job_files[i]
      const progress = 20 + (i / job.job_files.length) * 50
      onProgress?.(Math.round(progress))

      // Download file
      const urlParts = file.file_url.split('/')
      const fileName = decodeURIComponent(urlParts[urlParts.length - 1])
      const path = `${jobId}/${fileName}`
      
      const { data: fileBlob, error: downloadError } = await supabase
        .storage
        .from('job-files')
        .download(path)

      if (downloadError || !fileBlob) {
        console.error('Failed to download file:', downloadError)
        continue
      }

      // Process CSV
      const text = await fileBlob.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length <= 1) continue

      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
      
      // Get mappings for this file
      const fileMappings = job.column_mappings.filter((m: any) => m.job_file_id === file.id)
      
      // Process each data row
      for (let rowIdx = 1; rowIdx < lines.length; rowIdx++) {
        const values = lines[rowIdx].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
        const sourceRow: Record<string, any> = {}
        headers.forEach((header, idx) => {
          sourceRow[header] = values[idx] || ''
        })

        // Create target row based on schema
        const targetRow: Record<string, any> = {}
        
        for (const schemaCol of schemaColumns) {
          const mapping = fileMappings.find((m: any) => m.target_column === schemaCol.name)
          
          if (mapping) {
            if (mapping.transformation_type && mapping.transformation_config) {
              // Apply transformation
              try {
                const result = await TransformationEngine.transform(
                  sourceRow,
                  mapping.source_columns,
                  mapping.transformation_config
                )
                targetRow[schemaCol.name] = result
              } catch (e) {
                console.error('Transformation error:', e)
                targetRow[schemaCol.name] = ''
              }
            } else {
              // Direct mapping
              targetRow[schemaCol.name] = sourceRow[mapping.source_columns[0]] || ''
            }
          } else {
            targetRow[schemaCol.name] = ''
          }
        }
        
        allProcessedData.push(targetRow)
      }
    }

    onProgress?.(80)

    // Create Excel file
    const ws = XLSX.utils.json_to_sheet(allProcessedData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Merged Data')
    
    // Generate buffer
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    
    // Upload to storage
    const outputFileName = `${job.schemas.name}_merged_${new Date().toISOString().split('T')[0]}.xlsx`
    const outputPath = `${jobId}/output/${outputFileName}`
    
    const { error: uploadError } = await supabase
      .storage
      .from('job-files')
      .upload(outputPath, blob, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true
      })

    if (uploadError) {
      throw new Error('Failed to upload output file')
    }

    onProgress?.(90)

    // Update job with output file
    await supabase
      .from('jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        output_file_path: outputPath,
        metadata: {
          rows_processed: allProcessedData.length,
          files_processed: job.job_files.length
        }
      })
      .eq('id', jobId)

    onProgress?.(100)

    return {
      success: true,
      outputPath,
      rowsProcessed: allProcessedData.length
    }

  } catch (error: any) {
    // Update job status to failed
    await supabase
      .from('jobs')
      .update({ status: 'failed' })
      .eq('id', jobId)
    
    throw error
  }
}