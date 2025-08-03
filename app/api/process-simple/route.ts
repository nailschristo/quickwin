import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobId } = body

    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing jobId in request body' },
        { status: 400 }
      )
    }

    // For now, just return success to test the endpoint
    return NextResponse.json({
      success: true,
      message: 'Processing started',
      jobId: jobId
    })

  } catch (error: any) {
    console.error('Process simple error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process job' },
      { status: 500 }
    )
  }
}