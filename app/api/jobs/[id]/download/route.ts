import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
import { smartNameSplit } from '@/lib/transformations/common'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id

    // Verify user is authenticated
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get job with schema and files
    const { data: job } = await supabase
      .from('jobs')
      .select(`
        *,
        schemas!inner(
          name,
          schema_columns(*)
        ),
        job_files(*)
      `)
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found or unauthorized' },
        { status: 404 }
      )
    }

    if (job.status !== 'completed') {
      return NextResponse.json(
        { error: 'Job processing not complete' },
        { status: 400 }
      )
    }

    // Get column mappings
    const { data: mappings } = await supabase
      .from('column_mappings')
      .select('*')
      .eq('job_id', jobId)

    // Create workbook
    const wb = XLSX.utils.book_new()
    
    // Create header row from schema columns
    const schemaColumns = job.schemas.schema_columns
      .sort((a: any, b: any) => a.position - b.position)
      .map((col: any) => col.name)
    
    // Collect all rows from processed files
    const allRows: any[] = []
    
    for (const file of job.job_files) {
      if (!file.processed_data?.preview_data) continue
      
      // Get mappings for this file
      const fileMappings = mappings?.filter(m => m.file_id === file.id) || []
      
      // Transform each row according to mappings
      for (const sourceRow of file.processed_data.preview_data) {
        const targetRow: any = {}
        
        // Initialize all schema columns with empty values
        schemaColumns.forEach((col: string) => {
          targetRow[col] = ''
        })
        
        // Apply mappings with transformation support
        fileMappings.forEach(mapping => {
          if (sourceRow[mapping.source_column] !== undefined) {
            const sourceValue = sourceRow[mapping.source_column]
            
            // Check for special transformation cases
            if (mapping.source_column.toLowerCase() === 'name' && 
                mapping.target_column.toLowerCase().includes('first')) {
              // This is a name field mapped to first name - apply splitting
              const { firstName, lastName } = smartNameSplit(sourceValue)
              targetRow[mapping.target_column] = firstName
              
              // Also set last name if there's a last name column
              const lastNameCol = schemaColumns.find((col: string) => 
                col.toLowerCase().includes('last') && col.toLowerCase().includes('name')
              )
              if (lastNameCol) {
                targetRow[lastNameCol] = lastName
              }
            } else {
              // Regular mapping
              targetRow[mapping.target_column] = sourceValue
            }
          }
        })
        
        allRows.push(targetRow)
      }
    }
    
    // Convert to worksheet
    const ws = XLSX.utils.json_to_sheet(allRows, { header: schemaColumns })
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Merged Data')
    
    // Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    
    // Return file
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${job.schemas.name}_merged_${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    })

  } catch (error: any) {
    console.error('Download error:', error)
    
    return NextResponse.json(
      { error: error.message || 'Failed to generate download' },
      { status: 500 }
    )
  }
}