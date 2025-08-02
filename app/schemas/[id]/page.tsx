import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function SchemaDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Fetch schema with columns
  const { data: schema, error: schemaError } = await supabase
    .from('schemas')
    .select(`
      *,
      schema_columns (*)
    `)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (schemaError || !schema) {
    redirect('/schemas')
  }

  // Sort columns by position
  const sortedColumns = schema.schema_columns?.sort((a: any, b: any) => a.position - b.position) || []


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
              <h1 className="ml-4 text-xl font-semibold text-gray-900">{schema.name}</h1>
            </div>
            <div className="flex space-x-3">
              <Link
                href={`/schemas/${params.id}/edit`}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Edit Schema
              </Link>
              <Link
                href={`/jobs/new?schemaId=${params.id}`}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
              >
                Use This Schema
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Schema Info */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Schema Information</h2>
            {schema.description && (
              <p className="text-gray-600 mb-4">{schema.description}</p>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Created:</span>{' '}
                <span className="text-gray-900">{new Date(schema.created_at).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-gray-500">Last Updated:</span>{' '}
                <span className="text-gray-900">{new Date(schema.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Schema Columns */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Columns ({sortedColumns.length})
            </h2>
            
            {sortedColumns.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No columns defined for this schema.</p>
            ) : (
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Column Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sample Values
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedColumns.map((column: any, index: number) => (
                      <tr key={column.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {column.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {column.sample_values ? (
                            <span className="text-xs">
                              {JSON.parse(column.sample_values).slice(0, 3).join(', ')}
                              {JSON.parse(column.sample_values).length > 3 && '...'}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Usage Stats */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Usage Statistics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-md p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-xs text-gray-500">Jobs Run</p>
              </div>
              <div className="bg-gray-50 rounded-md p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-xs text-gray-500">Files Processed</p>
              </div>
              <div className="bg-gray-50 rounded-md p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-xs text-gray-500">Rows Generated</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}