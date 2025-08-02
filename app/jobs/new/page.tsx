'use client'

import { useState } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Step components
import SchemaStep from '@/components/jobs/SchemaStep'
import UploadStep from '@/components/jobs/UploadStep'
import MappingStep from '@/components/jobs/MappingStep'
import ProcessingStep from '@/components/jobs/ProcessingStep'

export default function NewJobPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [jobData, setJobData] = useState({
    schemaId: null,
    schemaName: '',
    files: [],
    mappings: {},
  })

  const steps = [
    { id: 1, name: 'Choose Schema', description: 'Select or create your output structure' },
    { id: 2, name: 'Upload Files', description: 'Add files to process' },
    { id: 3, name: 'Review Mappings', description: 'Confirm column mappings' },
    { id: 4, name: 'Process & Download', description: 'Get your standardized data' },
  ]

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const updateJobData = (data: Partial<typeof jobData>) => {
    setJobData({ ...jobData, ...data })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-gray-900 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="ml-4 text-xl font-semibold text-gray-900">New Job</h1>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav aria-label="Progress">
          <ol className="flex items-center">
            {steps.map((step, stepIdx) => (
              <li key={step.name} className={stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20 relative' : 'relative'}>
                {stepIdx !== steps.length - 1 && (
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className={`h-0.5 w-full ${currentStep > step.id ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                  </div>
                )}
                <div className="relative flex items-center group">
                  <span
                    className={`h-9 w-9 rounded-full flex items-center justify-center ${
                      currentStep > step.id
                        ? 'bg-indigo-600 hover:bg-indigo-900'
                        : currentStep === step.id
                        ? 'bg-white border-2 border-indigo-600'
                        : 'bg-white border-2 border-gray-300'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span className={`${currentStep === step.id ? 'text-indigo-600' : 'text-gray-500'}`}>
                        {step.id}
                      </span>
                    )}
                  </span>
                  <span className="ml-4 min-w-0 flex flex-col">
                    <span className={`text-sm font-medium ${currentStep >= step.id ? 'text-gray-900' : 'text-gray-500'}`}>
                      {step.name}
                    </span>
                    <span className="text-xs text-gray-500">{step.description}</span>
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </nav>

        {/* Step Content */}
        <div className="mt-8">
          {currentStep === 1 && (
            <SchemaStep
              jobData={jobData}
              updateJobData={updateJobData}
              onNext={handleNext}
            />
          )}
          {currentStep === 2 && (
            <UploadStep
              jobData={jobData}
              updateJobData={updateJobData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {currentStep === 3 && (
            <MappingStep
              jobData={jobData}
              updateJobData={updateJobData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {currentStep === 4 && (
            <ProcessingStep
              jobData={jobData}
              onBack={handleBack}
            />
          )}
        </div>
      </div>
    </div>
  )
}