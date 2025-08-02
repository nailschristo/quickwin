'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface SchemaCardProps {
  schema: {
    id: string
    name: string
    description: string | null
    created_at: string
  }
}

export function SchemaCard({ schema }: SchemaCardProps) {
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${schema.name}"?`)) {
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('schemas')
      .delete()
      .eq('id', schema.id)

    if (error) {
      alert('Error deleting schema')
      console.error(error)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-gray-900">{schema.name}</h3>
        <button
          onClick={handleDelete}
          className="text-red-600 hover:text-red-800"
          aria-label="Delete schema"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      <p className="text-sm text-gray-600 mb-4">{schema.description || 'No description'}</p>
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">
          Created {new Date(schema.created_at).toLocaleDateString()}
        </span>
        <Link
          href={`/schemas/${schema.id}`}
          className="text-sm text-indigo-600 hover:text-indigo-900"
        >
          View Details
        </Link>
      </div>
    </div>
  )
}