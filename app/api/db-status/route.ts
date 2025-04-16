import { NextResponse } from 'next/server'
import { log } from '@/lib/logger'

export async function GET() {
  try {
    log('Forwarding DB status check to backend API', {}, 'info')
    
    // Make sure we have a properly formatted URL
    let apiUrl = process.env.API_BASE_URL || 'http://localhost:3001'
    
    // Remove trailing slash if present
    if (apiUrl.endsWith('/')) {
      apiUrl = apiUrl.slice(0, -1)
    }
    
    const fullUrl = `${apiUrl}/api/db-status`
    log(`Forwarding DB status check to ${fullUrl}`, {}, 'debug')
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      log('DB status check failed', { status: response.status }, 'error')
      return NextResponse.json(
        { 
          status: 'error', 
          connected: false,
          error: `Backend returned ${response.status}`,
          message: 'Failed to connect to database API'
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    log('DB status proxy error', { error: String(error) }, 'error')
    return NextResponse.json(
      { 
        status: 'error', 
        connected: false,
        error: String(error),
        message: 'Failed to connect to database API'
      },
      { status: 500 }
    )
  }
}