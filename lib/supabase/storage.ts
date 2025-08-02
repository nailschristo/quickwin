import { createClient } from './client'

export async function uploadFile(
  file: File,
  bucket: 'uploads' | 'exports',
  userId: string,
  path?: string
) {
  const supabase = createClient()
  const fileName = `${Date.now()}-${file.name}`
  const filePath = path ? `${userId}/${path}/${fileName}` : `${userId}/${fileName}`

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file)

  if (error) {
    console.error('Upload error:', error)
    return { error }
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath)

  return { data: { path: data.path, url: publicUrl } }
}

export async function deleteFile(
  bucket: 'uploads' | 'exports',
  path: string
) {
  const supabase = createClient()
  
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])

  if (error) {
    console.error('Delete error:', error)
    return { error }
  }

  return { success: true }
}

export async function getSignedUrl(
  bucket: 'uploads' | 'exports',
  path: string,
  expiresIn: number = 3600
) {
  const supabase = createClient()
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error) {
    console.error('Signed URL error:', error)
    return { error }
  }

  return { data: data.signedUrl }
}