'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface SchemaColumn {
  id: string
  name: string
  position: number
}

export default function NewSchemaPage() {
  const router = useRouter()
  const [schemaName, setSchemaName] = useState('')
  const [schemaDescription, setSchemaDescription] = useState('')
  const [columns, setColumns] = useState<SchemaColumn[]>([
    { id: '1', name: '', position: 0 }
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)


  const addColumn = () => {
    const newColumn: SchemaColumn = {
      id: Date.now().toString(),
      name: '',
      position: columns.length
    }
    setColumns([...columns, newColumn])
  }

  const removeColumn = (id: string) => {
    if (columns.length === 1) return
    setColumns(columns.filter(col => col.id !== id))
  }

  const updateColumn = (id: string, field: keyof SchemaColumn, value: any) => {
    setColumns(columns.map(col => 
      col.id === id ? { ...col, [field]: value } : col
    ))
  }

  const moveColumn = (index: number, direction: 'up' | 'down') => {
    const newColumns = [...columns]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    
    if (newIndex < 0 || newIndex >= columns.length) return
    
    [newColumns[index], newColumns[newIndex]] = [newColumns[newIndex], newColumns[index]]
    setColumns(newColumns.map((col, idx) => ({ ...col, position: idx })))
  }

  const handleSave = async () => {
    if (!schemaName.trim()) {
      setError('Schema name is required')
      return
    }

    const validColumns = columns.filter(col => col.name.trim())
    if (validColumns.length === 0) {
      setError('At least one column is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Create schema
      const { data: schema, error: schemaError } = await supabase
        .from('schemas')
        .insert({
          name: schemaName,
          description: schemaDescription,
          user_id: user.id,
          source: 'manual'
        })
        .select()
        .single()

      if (schemaError) throw schemaError

      // Create columns
      const columnsToInsert = validColumns.map((col, index) => ({
        schema_id: schema.id,
        name: col.name,
        data_type: 'text', // All columns are text for Excel output
        position: index
      }))

      const { error: columnsError } = await supabase
        .from('schema_columns')
        .insert(columnsToInsert)

      if (columnsError) throw columnsError

      // Check if we came from the job wizard
      const urlParams = new URLSearchParams(window.location.search)
      const redirect = urlParams.get('redirect')
      
      if (redirect === '/jobs/new') {
        router.push(`/jobs/new?schemaId=${schema.id}`)
      } else {
        router.push('/schemas')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create schema')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/schemas" className="text-gray-900 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="ml-4 text-xl font-semibold text-gray-900">Create New Schema</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Schema Details */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Schema Details</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Schema Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={schemaName}
                  onChange={(e) => setSchemaName(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="e.g., Invoice Data, Contact List"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  value={schemaDescription}
                  onChange={(e) => setSchemaDescription(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Describe what this schema is for..."
                />
              </div>
            </div>
          </div>

          {/* Schema Columns */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Schema Columns</h2>
                <p className="text-sm text-gray-500 mt-1">Define the column headers for your output Excel file</p>
              </div>
              <button
                onClick={addColumn}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Column
              </button>
            </div>

            <div className="space-y-3">
              {columns.map((column, index) => (
                <div key={column.id} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex flex-col space-y-1">
                    <button
                      onClick={() => moveColumn(index, 'up')}
                      disabled={index === 0}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveColumn(index, 'down')}
                      disabled={index === columns.length - 1}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  <input
                    type="text"
                    value={column.name}
                    onChange={(e) => updateColumn(column.id, 'name', e.target.value)}
                    placeholder="Column name (e.g., Invoice Number, Customer Name, Amount)"
                    className="flex-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />

                  <button
                    onClick={() => removeColumn(column.id)}
                    disabled={columns.length === 1}
                    className="text-red-600 hover:text-red-800 disabled:opacity-30"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex justify-between">
            <Link
              href="/schemas"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Schema'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}