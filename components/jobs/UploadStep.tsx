'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { createClient } from '@/lib/supabase/client'

interface UploadStepProps {
  jobData: any
  updateJobData: (data: any) => void
  onNext: () => void
  onBack: () => void
}

export default function UploadStep({ jobData, updateJobData, onNext, onBack }: UploadStepProps) {
  const [files, setFiles] = useState<File[]>(jobData.files || [])
  const [uploading, setUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<any[]>(jobData.uploadedFiles || [])
  const supabase = createClient()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp']
    }
  })

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleContinue = async () => {
    if (files.length === 0) return

    setUploading(true)
    
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('You must be logged in to upload files')
        setUploading(false)
        return
      }
      
      // Generate a temporary job ID for file organization
      const tempJobId = `temp_${Date.now()}`
      const uploadedFilesData: any[] = []
      
      // Upload each file to Supabase Storage
      for (const file of files) {
        const filePath = `${tempJobId}/${file.name}`
        
        console.log('Uploading file:', file.name, 'to path:', filePath)
        
        const { data, error } = await supabase.storage
          .from('job-files')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })
          
        if (error) {
          console.error('Upload error:', error)
          alert(`Failed to upload ${file.name}: ${error.message}`)
          continue
        }
        
        console.log('Upload successful:', data)
        
        // Get the public URL for the uploaded file
        const { data: { publicUrl } } = supabase.storage
          .from('job-files')
          .getPublicUrl(filePath)
        
        uploadedFilesData.push({
          name: file.name,
          url: publicUrl,
          path: filePath,
          size: file.size,
          type: file.type
        })
      }
      
      if (uploadedFilesData.length === 0) {
        alert('No files were uploaded successfully')
        setUploading(false)
        return
      }
      
      // Update job data with uploaded files
      updateJobData({ 
        files: uploadedFilesData,
        tempJobId 
      })
      
      onNext()
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload files. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Upload Files to Process</h2>
        <p className="mt-1 text-sm text-gray-500">
          Using schema: <span className="font-medium text-gray-900">{jobData.schemaName || 'Unnamed Schema'}</span>
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive ? 'Drop files here' : 'Drag and drop files here, or click to select'}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Supported: CSV, Excel, PDF, Images (PNG, JPG, etc.)
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Selected Files ({files.length})</h3>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div className="flex items-center space-x-3">
                  <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
          disabled={files.length === 0 || uploading}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading...' : 'Next: Review Mappings'}
        </button>
      </div>
    </div>
  )
}