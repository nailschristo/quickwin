'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface SchemaStepProps {
  jobData: any
  updateJobData: (data: any) => void
  onNext: () => void
}

export default function SchemaStep({ jobData, updateJobData, onNext }: SchemaStepProps) {
  const [selectedOption, setSelectedOption] = useState<'existing' | 'template' | 'new' | 'import'>('existing')
  const [schemas, setSchemas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSchemaId, setSelectedSchemaId] = useState(jobData.schemaId)

  useEffect(() => {
    loadSchemas()
  }, [])

  const loadSchemas = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('schemas')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) {
      setSchemas(data)
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
          user_id: user.id
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

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        How would you like to define your output structure?
      </h2>

      <div className="space-y-4">
        {/* Use Existing Schema */}
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
              {selectedOption === 'existing' && (
                <div className="mt-3">
                  {loading ? (
                    <p className="text-sm text-gray-500">Loading schemas...</p>
                  ) : schemas.length === 0 ? (
                    <p className="text-sm text-gray-500">No schemas found. Create your first schema!</p>
                  ) : (
                    <select
                      value={selectedSchemaId || ''}
                      onChange={(e) => setSelectedSchemaId(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      <option value="">Select a schema</option>
                      {schemas.map((schema) => (
                        <option key={schema.id} value={schema.id}>
                          {schema.name} - {schema.description || 'No description'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

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
              <p className="text-sm text-gray-500">Design a custom schema with our visual builder</p>
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
            <div className="ml-3">
              <label className="block text-sm font-medium text-gray-900">
                Import from Excel
              </label>
              <p className="text-sm text-gray-500">Upload a sample Excel file to extract headers</p>
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
          disabled={
            (selectedOption === 'existing' && !selectedSchemaId) ||
            (selectedOption === 'template' && !selectedTemplateId)
          }
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next: Upload Files
        </button>
      </div>
    </div>
  )
}