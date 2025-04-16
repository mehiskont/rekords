import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    log('Proxying session check to backend API', {}, 'info')
    
    const apiUrl = process.env.API_BASE_URL || 'http://localhost:3001'
    const cookies = request.headers.get('cookie') || ''
    
    log(`Forwarding session check to ${apiUrl}/api/auth/session`, {}, 'info')
    
    const response = await fetch(`${apiUrl}/api/auth/session`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward cookies from browser to backend
        'Cookie': cookies
      },
      credentials: 'include'
    })

    if (!response.ok) {
      log('Session check failed', { status: response.status }, 'error')
      return NextResponse.json(
        { error: 'Session check failed' },
        { status: response.status }
      )
    }

    // Get response data
    const data = await response.json()
    
    // Create response
    const nextResponse = NextResponse.json(data)

    // Forward cookies from backend to browser
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        nextResponse.headers.set(key, value)
      }
    })

    return nextResponse
  } catch (error) {
    log('Session proxy error', { error: String(error) }, 'error')
    return NextResponse.json(
      { error: 'SessionError' },
      { status: 500 }
    )
  }
}