import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    log('Proxying credentials login to backend API', {}, 'info')
    
    // Get the request body
    let body;
    try {
      body = await request.json();
      log('Received login request', { email: body.email }, 'info')
    } catch (error) {
      log('Failed to parse request body', { error: String(error) }, 'error')
      return NextResponse.json({ error: 'InvalidRequest' }, { status: 400 })
    }
    
    // Make sure we have a properly formatted URL
    let apiUrl = process.env.API_BASE_URL
    if (!apiUrl) {
      log('API_BASE_URL not configured', {}, 'error')
      return NextResponse.json({ error: 'ServerConfigurationError' }, { status: 500 })
    }
    
    // Remove trailing slash if present
    if (apiUrl.endsWith('/')) {
      apiUrl = apiUrl.slice(0, -1)
    }
    
    const fullUrl = `${apiUrl}/api/auth/login`
    
    log(`Forwarding credentials to ${fullUrl}`, { email: body.email }, 'info')
    
    // Forward the request to the backend API
    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(body)
      })

      // Get the response data
      let responseText = '';
      try {
        responseText = await response.text();
        log('Received API response', { 
          status: response.status, 
          textLength: responseText.length 
        }, 'info');
      } catch (error) {
        log('Failed to read response text', { error: String(error) }, 'error')
        return NextResponse.json({ error: 'CredentialsSignin' }, { status: 401 })
      }

      // Try to parse JSON response if available
      let responseData;
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (error) {
        log('Failed to parse JSON response', { 
          error: String(error), 
          responseText: responseText.substring(0, 100) + '...' 
        }, 'error')
        responseData = { error: 'InvalidResponse' };
      }

      if (response.ok) {
        log('Login successful via API', { email: body.email }, 'info')
        
        // Create the response
        const nextResponse = NextResponse.json(responseData)

        // Forward cookies from backend to browser
        response.headers.forEach((value, key) => {
          if (key.toLowerCase() === 'set-cookie') {
            nextResponse.headers.set(key, value)
          }
        })

        return nextResponse
      } else {
        log('Login failed via API', { 
          status: response.status, 
          email: body.email,
          errorMessage: responseData.error || 'Unknown error' 
        }, 'warn')
        
        return NextResponse.json(
          { error: 'CredentialsSignin' },
          { status: 401 }
        )
      }
    } catch (error) {
      log('API request failed', { error: String(error), url: fullUrl }, 'error')
      return NextResponse.json({ error: 'CredentialsSignin' }, { status: 401 })
    }
  } catch (error) {
    log('Credentials proxy handler error', { error: String(error) }, 'error')
    return NextResponse.json({ error: 'CredentialsSignin' }, { status: 401 })
  }
}