'use client'

import { useState, useEffect } from 'react'

interface MappingStepProps {
  jobData: any
  updateJobData: (data: any) => void
  onNext: () => void
  onBack: () => void
}

export default function MappingStep({ jobData, updateJobData, onNext, onBack }: MappingStepProps) {
  const [mappings, setMappings] = useState<any>({})
  const [processing, setProcessing] = useState(false)

  // Mock schema columns - in real app, fetch from database
  const schemaColumns = [
    { name: 'Invoice Number', type: 'text', required: true },
    { name: 'Date', type: 'date', required: true },
    { name: 'Vendor Name', type: 'text', required: true },
    { name: 'Amount', type: 'number', required: true },
    { name: 'Description', type: 'text', required: false },
    { name: 'Category', type: 'text', required: false },
  ]

  // Mock detected columns from files - in real app, parse files
  const detectedColumns = [
    { file: 'invoice1.csv', columns: ['inv_num', 'date', 'vendor', 'total', 'notes'] },
    { file: 'invoice2.pdf', columns: ['Invoice #', 'Date', 'Company', 'Total Amount', 'Description'] },
  ]

  // Mock AI-suggested mappings
  useEffect(() => {
    const suggestedMappings: any = {}
    detectedColumns.forEach((file) => {
      suggestedMappings[file.file] = {}
      schemaColumns.forEach((schemaCol) => {
        // Simple fuzzy matching logic
        const match = file.columns.find(col => 
          col.toLowerCase().includes(schemaCol.name.toLowerCase().split(' ')[0])
        )
        if (match) {
          suggestedMappings[file.file][schemaCol.name] = {
            source: match,
            confidence: 0.85
          }
        }
      })
    })
    setMappings(suggestedMappings)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMappingChange = (file: string, schemaColumn: string, sourceColumn: string) => {
    setMappings((prev: any) => ({
      ...prev,
      [file]: {
        ...prev[file],
        [schemaColumn]: {
          source: sourceColumn,
          confidence: 1.0 // Manual mapping has 100% confidence
        }
      }
    }))
  }

  const handleContinue = () => {
    updateJobData({ mappings })
    onNext()
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
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
        {detectedColumns.map((file) => (
          <div key={file.file} className="border rounded-lg p-4">
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
                    {schemaCol.required && <span className="text-red-500 ml-1">*</span>}
                  </div>
                  <div className="text-center">
                    <svg className="h-5 w-5 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value={mappings[file.file]?.[schemaCol.name]?.source || ''}
                      onChange={(e) => handleMappingChange(file.file, schemaCol.name, e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      <option value="">-- Not mapped --</option>
                      {file.columns.map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                    {mappings[file.file]?.[schemaCol.name] && (
                      <span className={`text-xs ${getConfidenceColor(mappings[file.file][schemaCol.name].confidence)}`}>
                        {Math.round(mappings[file.file][schemaCol.name].confidence * 100)}%
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
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
        >
          Process Files
        </button>
      </div>
    </div>
  )
}