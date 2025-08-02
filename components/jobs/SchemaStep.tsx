'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface SchemaStepProps {
  jobData: any
  updateJobData: (data: any) => void
  onNext: () => void
}

export default function SchemaStep({ jobData, updateJobData, onNext }: SchemaStepProps) {
  const [selectedOption, setSelectedOption] = useState<'existing' | 'template' | 'new' | 'import' | null>(null)
  const [schemas, setSchemas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSchemaId, setSelectedSchemaId] = useState(jobData.schemaId)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  useEffect(() => {
    loadSchemas()
  }, [])

  const loadSchemas = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('schemas')
      .select('*')
      .eq('source', 'manual') // Only show manually created schemas
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
    
    if (data) {
      setSchemas(data)
      // Set initial option based on whether schemas exist
      if (data.length > 0 && !selectedOption) {
        setSelectedOption('existing')
      } else if (data.length === 0 && !selectedOption) {
        setSelectedOption('template')
      }
    }
    setLoading(false)
  }

  const handleContinue = async () => {
    if (selectedOption === 'existing' && selectedSchemaId) {
      const schema = schemas.find(s => s.id === selectedSchemaId)
      updateJobData({ 
        schemaId: selectedSchemaId,
        schemaName: schema?.name || ''
      })
      onNext()
    } else if (selectedOption === 'new') {
      // Navigate to schema builder
      window.location.href = '/schemas/new?redirect=/jobs/new'
    } else if (selectedOption === 'template' && selectedTemplateId) {
      // Create schema from template
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return
      
      const template = templates.find(t => t.id === selectedTemplateId)
      if (!template) return
      
      // Fetch template columns
      const { data: templateColumns } = await supabase
        .from('schema_template_columns')
        .select('*')
        .eq('template_id', selectedTemplateId)
        .order('position')
      
      // Create new schema from template
      const { data: newSchema, error: schemaError } = await supabase
        .from('schemas')
        .insert({
          name: template.name,
          description: template.description,
          user_id: user.id,
          source: 'template'
        })
        .select()
        .single()
      
      if (schemaError || !newSchema) return
      
      // Create columns for the new schema
      if (templateColumns && templateColumns.length > 0) {
        const columnsToInsert = templateColumns.map(col => ({
          schema_id: newSchema.id,
          name: col.name,
          data_type: 'text', // All columns are text for Excel output
          position: col.position,
          sample_values: col.sample_values
        }))
        
        await supabase
          .from('schema_columns')
          .insert(columnsToInsert)
      }
      
      updateJobData({ 
        schemaId: newSchema.id,
        schemaName: newSchema.name
      })
      onNext()
    } else if (selectedOption === 'import' && uploadedFile) {
      // Handle Excel import
      // For now, redirect to schema creation with a flag
      window.location.href = '/schemas/new?redirect=/jobs/new&import=true'
    }
  }

  const [templates, setTemplates] = useState<any[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  
  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('schema_templates')
      .select('*')
      .eq('is_public', true)
      .order('name')
    
    if (data) {
      setTemplates(data)
    }
  }

  // Get button text based on selected option
  const getButtonText = () => {
    switch (selectedOption) {
      case 'existing':
      case 'template':
        return 'Next: Upload Files'
      case 'new':
        return 'Create Schema'
      case 'import':
        return 'Import and Continue'
      default:
        return 'Next'
    }
  }

  // Check if the continue button should be disabled
  const isButtonDisabled = () => {
    if (!selectedOption) return true
    
    switch (selectedOption) {
      case 'existing':
        return !selectedSchemaId
      case 'template':
        return !selectedTemplateId
      case 'import':
        return !uploadedFile
      default:
        return false
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">
        How would you like to define your output structure?
      </h2>
      {loading ? (
        <p className="text-sm text-gray-500 mb-6">Checking your schemas...</p>
      ) : schemas.length === 0 ? (
        <p className="text-sm text-gray-500 mb-6">
          A schema defines the columns for your output Excel file. Let's create your first one!
        </p>
      ) : (
        <p className="text-sm text-gray-500 mb-6">
          Choose how to structure your data output
        </p>
      )}

      <div className="space-y-4">
        {/* Use Existing Schema - Only show if schemas exist */}
        {schemas.length > 0 && (
          <div className={`border rounded-lg p-4 cursor-pointer transition-all ${
            selectedOption === 'existing' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'
          }`} onClick={() => setSelectedOption('existing')}>
            <div className="flex items-start">
              <input
                type="radio"
                name="schema-option"
                checked={selectedOption === 'existing'}
                onChange={() => setSelectedOption('existing')}
                className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
              />
              <div className="ml-3 flex-1">
                <label className="block text-sm font-medium text-gray-900">
                  Use Recent Schema
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Reuse a schema you've created before
                </p>
                {selectedOption === 'existing' && (
                  <div className="mt-3">
                    <select
                      value={selectedSchemaId || ''}
                      onChange={(e) => setSelectedSchemaId(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      <option value="">Select a schema</option>
                      {schemas.map((schema) => {
                        const isRecent = schema.last_used_at && 
                          new Date(schema.last_used_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        return (
                          <option key={schema.id} value={schema.id}>
                            {schema.name} {isRecent && '⭐'} - {schema.description || 'No description'}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Start from Template */}
        <div className={`border rounded-lg p-4 cursor-pointer transition-all ${
          selectedOption === 'template' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'
        }`} onClick={() => setSelectedOption('template')}>
          <div className="flex items-start">
            <input
              type="radio"
              name="schema-option"
              checked={selectedOption === 'template'}
              onChange={() => setSelectedOption('template')}
              className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
            />
            <div className="ml-3 flex-1">
              <label className="block text-sm font-medium text-gray-900">
                Start from Template
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Use pre-built templates for common use cases
              </p>
              {selectedOption === 'template' && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={`flex items-start p-3 border rounded-md cursor-pointer transition-all ${
                        selectedTemplateId === template.id
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-2xl mr-3">{template.icon || '📋'}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{template.name}</p>
                        <p className="text-xs text-gray-500">{template.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Create New Schema */}
        <div className={`border rounded-lg p-4 cursor-pointer transition-all ${
          selectedOption === 'new' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'
        }`} onClick={() => setSelectedOption('new')}>
          <div className="flex items-start">
            <input
              type="radio"
              name="schema-option"
              checked={selectedOption === 'new'}
              onChange={() => setSelectedOption('new')}
              className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
            />
            <div className="ml-3">
              <label className="block text-sm font-medium text-gray-900">
                Create New Schema
              </label>
              <p className="text-xs text-gray-500 mt-1">Design a custom schema with our visual builder</p>
            </div>
          </div>
        </div>

        {/* Import from Excel */}
        <div className={`border rounded-lg p-4 cursor-pointer transition-all ${
          selectedOption === 'import' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'
        }`} onClick={() => setSelectedOption('import')}>
          <div className="flex items-start">
            <input
              type="radio"
              name="schema-option"
              checked={selectedOption === 'import'}
              onChange={() => setSelectedOption('import')}
              className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
            />
            <div className="ml-3 flex-1">
              <label className="block text-sm font-medium text-gray-900">
                Import from Excel
              </label>
              <p className="text-xs text-gray-500 mt-1">Upload a sample Excel file to extract headers</p>
              {selectedOption === 'import' && (
                <div className="mt-3">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  {uploadedFile && (
                    <p className="mt-2 text-xs text-gray-500">
                      Selected: {uploadedFile.name}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleContinue}
          disabled={isButtonDisabled()}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {getButtonText()}
        </button>
      </div>
    </div>
  )
}