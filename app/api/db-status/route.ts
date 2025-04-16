import { NextResponse } from 'next/server'
import { log } from '@/lib/logger'

export async function GET() {
  try {
    log('DB status check requested', {}, 'info')
    
    // Use env var to determine whether to force fallback auth
    const forceFallback = process.env.AUTH_FORCE_FALLBACK === 'true'
    
    if (forceFallback) {
      log('Using fallback DB status (AUTH_FORCE_FALLBACK=true)', {}, 'info')
      return NextResponse.json({ 
        status: 'fallback', 
        connected: false,
        forceFallback: true,
        message: 'Using fallback authentication due to AUTH_FORCE_FALLBACK=true' 
      })
    }
    
    // Try to connect to the backend API
    try {
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
        cache: 'no-store',
        // Add a short timeout to avoid hanging the UI
        signal: AbortSignal.timeout(3000)
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
      // Backend API error - use fallback
      log('DB status check failed with connection error', { error: String(error) }, 'error')
      return NextResponse.json(
        { 
          status: 'error', 
          connected: false,
          forceFallback: true,
          error: String(error),
          message: 'Unable to reach backend API - using fallback authentication'
        },
        { status: 500 }
      )
    }
  } catch (error) {
    log('DB status handler error', { error: String(error) }, 'error')
    return NextResponse.json(
      { 
        status: 'error', 
        connected: false,
        error: String(error),
        message: 'Failed to process DB status check'
      },
      { status: 500 }
    )
  }
}