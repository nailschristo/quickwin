'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import ColumnMappingSelect from './ColumnMappingSelect'

interface MappingStepProps {
  jobData: any
  updateJobData: (data: any) => void
  onNext: () => void
  onBack: () => void
}

export default function MappingStep({ jobData, updateJobData, onNext, onBack }: MappingStepProps) {
  const [mappings, setMappings] = useState<any>({})
  const [processing, setProcessing] = useState(false)
  const [schemaColumns, setSchemaColumns] = useState<any[]>([])
  const [detectedColumns, setDetectedColumns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [jobId, setJobId] = useState<string | null>(null)
  const supabase = createClient()

  // Load schema columns and process files
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        
        // Fetch schema columns
        const { data: schemaData } = await supabase
          .from('schema_columns')
          .select('*')
          .eq('schema_id', jobData.schemaId)
          .order('position')
        
        if (schemaData) {
          setSchemaColumns(schemaData)
        }
        
        // Create job record
        const { data: newJob, error: jobError } = await supabase
          .from('jobs')
          .insert({
            user_id: user.id,
            schema_id: jobData.schemaId,
            status: 'pending'
          })
          .select()
          .single()
        
        if (jobError) throw jobError
        
        setJobId(newJob.id)
        updateJobData({ jobId: newJob.id })
        
        // Move files from temp location to job location and create job_files records
        const fileRecords: any[] = []
        
        for (const file of jobData.files) {
          // Move file from temp location to job location
          const oldPath = file.path
          const newPath = `${newJob.id}/${file.name}`
          
          console.log('Moving file from:', oldPath, 'to:', newPath)
          
          // Copy file to new location
          const { data: downloadData, error: downloadError } = await supabase.storage
            .from('job-files')
            .download(oldPath)
            
          if (downloadError) {
            console.error('Download error:', downloadError)
            continue
          }
          
          // Upload to new location
          const { error: uploadError } = await supabase.storage
            .from('job-files')
            .upload(newPath, downloadData, {
              cacheControl: '3600',
              upsert: false
            })
            
          if (uploadError) {
            console.error('Upload error:', uploadError)
            continue
          }
          
          // Delete old file
          await supabase.storage
            .from('job-files')
            .remove([oldPath])
          
          // Get new public URL
          const { data: { publicUrl } } = supabase.storage
            .from('job-files')
            .getPublicUrl(newPath)
          
          fileRecords.push({
            job_id: newJob.id,
            file_name: file.name,
            file_type: file.name.split('.').pop() || 'unknown',
            file_url: publicUrl
          })
        }
        
        const { data: jobFiles, error: filesError } = await supabase
          .from('job_files')
          .insert(fileRecords)
          .select()
        
        if (filesError) throw filesError
        
        // Process each file to detect columns
        const detectedCols: any[] = []
        console.log('JobFiles created:', jobFiles)
        
        for (const jobFile of jobFiles) {
          // For now, we'll process CSV files client-side as a demo
          if (jobFile.file_type === 'csv') {
            try {
              console.log('Processing file:', jobFile.file_name, 'URL:', jobFile.file_url)
              console.log('Full jobFile object:', jobFile)
              
              // The file should already be at the correct path
              const path = `${newJob.id}/${jobFile.file_name}`
              
              console.log('Downloading from path:', path)
              console.log('Storage bucket: job-files')
              
              const { data: fileData, error: downloadError } = await supabase.storage
                .from('job-files')
                .download(path)
              
              if (downloadError) {
                console.error('Download error:', downloadError)
                continue
              }
              
              if (fileData) {
                const text = await fileData.text()
                const lines = text.split('\n').filter(line => line.trim())
                if (lines.length > 0) {
                  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
                  console.log('Detected headers for', jobFile.file_name, ':', headers)
                  const fileEntry = {
                    file: jobFile.file_name,
                    fileId: jobFile.id,
                    columns: headers
                  }
                  console.log('Adding file entry:', fileEntry)
                  detectedCols.push(fileEntry)
                }
              }
            } catch (error) {
              console.error('Error processing file:', jobFile.file_name, error)
            }
          }
        }
        
        console.log('Final detectedCols array:', detectedCols)
        setDetectedColumns(detectedCols)
        
        // Generate AI-suggested mappings
        const suggestedMappings: any = {}
        detectedCols.forEach((file) => {
          suggestedMappings[file.fileId] = {}
          schemaData?.forEach((schemaCol: any) => {
            // Simple fuzzy matching logic
            const match = file.columns.find((col: string) => 
              col.toLowerCase().includes(schemaCol.name.toLowerCase().split(' ')[0]) ||
              schemaCol.name.toLowerCase().includes(col.toLowerCase())
            )
            if (match) {
              suggestedMappings[file.fileId][schemaCol.name] = {
                source: match,
                confidence: 0.85
              }
            }
          })
        })
        setMappings(suggestedMappings)
        
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    if (jobData.schemaId && jobData.files.length > 0) {
      loadData()
    }
  }, [jobData.schemaId, jobData.files]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMappingChange = (fileId: string, schemaColumn: string, sourceColumn: string) => {
    setMappings((prev: any) => ({
      ...prev,
      [fileId]: {
        ...prev[fileId],
        [schemaColumn]: {
          source: sourceColumn,
          confidence: 1.0 // Manual mapping has 100% confidence
        }
      }
    }))
  }

  const handleContinue = async () => {
    setProcessing(true)
    try {
      // Save column mappings to database
      const mappingRecords: any[] = []
      
      Object.entries(mappings).forEach(([fileId, fileMappings]: any) => {
        Object.entries(fileMappings).forEach(([targetColumn, mapping]: any) => {
          if (mapping.source) {
            mappingRecords.push({
              job_id: jobId,
              file_id: fileId,
              source_column: mapping.source,
              target_column: targetColumn,
              confidence: mapping.confidence,
              mapping_type: mapping.confidence === 1.0 ? 'manual' : 'ai'
            })
          }
        })
      })
      
      if (mappingRecords.length > 0) {
        const { error } = await supabase
          .from('column_mappings')
          .insert(mappingRecords)
        
        if (error) throw error
      }
      
      updateJobData({ mappings })
      onNext()
    } catch (error) {
      console.error('Error saving mappings:', error)
    } finally {
      setProcessing(false)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="ml-3 text-gray-600">Analyzing files...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Review Column Mappings</h2>
        <p className="mt-1 text-sm text-gray-500">
          We&apos;ve automatically mapped columns based on your schema. Review and adjust as needed.
        </p>
      </div>

      {/* Mapping Tables */}
      <div className="space-y-6">
        {detectedColumns.map((file, fileIndex) => (
          <div key={`${file.fileId}-${fileIndex}`} className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {file.file}
            </h3>
            <div className="space-y-2">
              {schemaColumns.map((schemaCol) => (
                <div key={schemaCol.name} className="grid grid-cols-3 gap-4 items-center py-2 border-b last:border-0">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{schemaCol.name}</span>
                  </div>
                  <div className="text-center">
                    <svg className="h-5 w-5 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ColumnMappingSelect
                      key={`mapping-${file.fileId}-${schemaCol.name}`}
                      fileId={file.fileId}
                      schemaColumnName={schemaCol.name}
                      availableColumns={file.columns || []}
                      value={mappings[file.fileId]?.[schemaCol.name]?.source || ''}
                      onChange={handleMappingChange}
                    />
                    {mappings[file.fileId]?.[schemaCol.name] && (
                      <span className={`text-xs ${getConfidenceColor(mappings[file.fileId][schemaCol.name].confidence)}`}>
                        {Math.round(mappings[file.fileId][schemaCol.name].confidence * 100)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* AI Assistance Note */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800">
              AI-powered mapping suggestions are shown with confidence scores. Review carefully before processing.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={processing}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? 'Saving...' : 'Process Files'}
        </button>
      </div>
    </div>
  )
}