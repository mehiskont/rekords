import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    log('Proxying credentials login to backend API', {}, 'info')
    
    const body = await request.json()
    const apiUrl = process.env.API_BASE_URL || 'http://localhost:3001'
    
    log(`Forwarding credentials to ${apiUrl}/api/auth/callback/credentials`, { 
      email: body.email 
    }, 'info')
    
    const response = await fetch(`${apiUrl}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      credentials: 'include'
    })

    // Get response data
    let responseData
    try {
      responseData = await response.json()
    } catch (e) {
      log('Failed to parse response from backend', { error: String(e) }, 'error')
      responseData = { error: 'InvalidResponse' }
    }

    // Create response with same status
    const nextResponse = NextResponse.json(
      responseData,
      { status: response.status }
    )

    // Forward cookies from backend to browser
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        nextResponse.headers.set(key, value)
      }
    })

    return nextResponse
  } catch (error) {
    log('Credentials proxy error', { error: String(error) }, 'error')
    return NextResponse.json(
      { error: 'CredentialsSignin' },
      { status: 401 }
    )
  }
}