import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Delete the schema (this will cascade delete schema_columns)
  const { error } = await supabase
    .from('schemas')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id) // Ensure user owns this schema

  if (error) {
    console.error('Error deleting schema:', error)
  }

  redirect('/schemas')
}