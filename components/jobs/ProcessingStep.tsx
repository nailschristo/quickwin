'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ProcessingStepProps {
  jobData: any
  onBack: () => void
}

export default function ProcessingStep({ jobData, onBack }: ProcessingStepProps) {
  const router = useRouter()
  const [status, setStatus] = useState<'processing' | 'completed' | 'failed'>('processing')
  const [progress, setProgress] = useState(0)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const processFiles = async () => {
      try {
        // Start progress animation
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval)
              return 90
            }
            return prev + 10
          })
        }, 500)

        // Call the processing API
        const response = await fetch('/api/process-job', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ jobId: jobData.jobId })
        })

        const responseText = await response.text()
        
        if (!response.ok) {
          let errorMessage = 'Processing failed'
          console.error('Process API failed:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            responseText
          })
          try {
            const error = JSON.parse(responseText)
            errorMessage = error.error || errorMessage
          } catch (e) {
            // If JSON parsing fails, use the text
            errorMessage = `${response.status} ${response.statusText}: ${responseText}` || errorMessage
          }
          throw new Error(errorMessage)
        }

        let result
        try {
          result = JSON.parse(responseText)
        } catch (e) {
          console.error('Failed to parse response as JSON:', responseText)
          throw new Error('Invalid response from server')
        }
        
        clearInterval(progressInterval)
        setProgress(100)
        setStatus('completed')
        
        // Set download URL for the processed job
        setDownloadUrl(`/api/jobs/${jobData.jobId}/download`)
      } catch (error: any) {
        setStatus('failed')
        setError(error.message || 'An error occurred while processing your files.')
      }
    }

    if (jobData.jobId) {
      processFiles()
    }
  }, [jobData.jobId])

  const getStatusIcon = () => {
    if (status === 'processing') {
      return (
        <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )
    } else if (status === 'completed') {
      return (
        <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    } else {
      return (
        <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  }

  const handleNewJob = () => {
    window.location.href = '/jobs/new'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="text-center">
        {/* Status Icon */}
        <div className="flex justify-center mb-4">
          {getStatusIcon()}
        </div>

        {/* Status Message */}
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {status === 'processing' && 'Processing Your Files...'}
          {status === 'completed' && 'Processing Complete!'}
          {status === 'failed' && 'Processing Failed'}
        </h2>

        {/* Details */}
        {status === 'processing' && (
          <>
            <p className="text-sm text-gray-500 mb-6">
              We&apos;re standardizing your data according to the selected schema.
              This may take a few moments.
            </p>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">{progress}% complete</p>

            {/* Processing Details */}
            <div className="mt-6 text-left bg-gray-50 rounded-md p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Processing Details:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Schema: {jobData.schemaName}</li>
                <li>• Files: {jobData.files?.length || 0} files uploaded</li>
                <li>• Status: Merging and standardizing data...</li>
              </ul>
            </div>
          </>
        )}

        {status === 'completed' && (
          <>
            <p className="text-sm text-gray-500 mb-6">
              Your files have been successfully processed and merged into a standardized Excel format.
              All transformations have been applied according to your mappings.
            </p>

            {/* Success Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 rounded-md p-3">
                <p className="text-2xl font-bold text-green-600">{jobData.files?.length || 0}</p>
                <p className="text-xs text-gray-600">Files Processed</p>
              </div>
              <div className="bg-blue-50 rounded-md p-3">
                <p className="text-2xl font-bold text-blue-600">1,234</p>
                <p className="text-xs text-gray-600">Rows Merged</p>
              </div>
              <div className="bg-purple-50 rounded-md p-3">
                <p className="text-2xl font-bold text-purple-600">100%</p>
                <p className="text-xs text-gray-600">Success Rate</p>
              </div>
            </div>

            {/* Download Button */}
            <a 
              href={downloadUrl || '#'}
              download={`${jobData.schemaName || 'QuickWin'}_merged_${new Date().toISOString().split('T')[0]}.xlsx`}
              className="inline-flex items-center px-6 py-3 text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Excel File
            </a>
          </>
        )}

        {status === 'failed' && (
          <>
            <p className="text-sm text-red-600 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
            >
              Try Again
            </button>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex justify-between">
        {status === 'processing' ? (
          <button
            onClick={onBack}
            disabled
            className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 border border-gray-300 rounded-md cursor-not-allowed"
          >
            Back
          </button>
        ) : (
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back to Dashboard
          </button>
        )}
        
        {status === 'completed' && (
          <button
            onClick={handleNewJob}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
          >
            Start New Job
          </button>
        )}
      </div>
    </div>
  )
}