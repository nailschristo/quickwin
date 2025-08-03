'use client'

import { memo } from 'react'

interface ColumnMappingSelectProps {
  fileId: string
  schemaColumnName: string
  availableColumns: string[]
  value: string
  onChange: (fileId: string, schemaColumn: string, value: string) => void
}

const ColumnMappingSelect = memo(function ColumnMappingSelect({
  fileId,
  schemaColumnName,
  availableColumns,
  value,
  onChange
}: ColumnMappingSelectProps) {
  console.log(`Rendering select for ${schemaColumnName} with columns:`, availableColumns)
  
  return (
    <select
      value={value}
      onChange={(e) => onChange(fileId, schemaColumnName, e.target.value)}
      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
    >
      <option value="">-- Not mapped --</option>
      {availableColumns.map((col, index) => (
        <option key={`${fileId}-${col}-${index}`} value={col}>
          {col}
        </option>
      ))}
    </select>
  )
})

export default ColumnMappingSelect