import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Check if we should use fallback authentication
    const useFallback = process.env.AUTH_FORCE_FALLBACK === "true";
    log('Credentials login attempt', { useFallback }, 'info')
    
    if (useFallback) {
      log('Using fallback auth credentials endpoint', {}, 'info')
      
      try {
        const body = await request.json();
        const { email, password } = body || {};
        
        if (!email || !password) {
          log('Missing email or password in fallback auth', {}, 'warn')
          return NextResponse.json({ error: 'CredentialsSignin' }, { status: 401 })
        }
        
        const testEmail = process.env.TEST_USER_EMAIL || "test@example.com";
        const testPassword = process.env.TEST_USER_PASSWORD || "password123";
        const adminEmail = process.env.ADMIN_USER_EMAIL || "admin@example.com";
        const adminPassword = process.env.ADMIN_USER_PASSWORD || "admin123";
        
        // Check credentials
        if (email === testEmail && password === testPassword) {
          log('Fallback auth successful for test user', { email }, 'info')
          return NextResponse.json({
            user: {
              id: "test-user-id-123",
              name: "Test User",
              email: testEmail,
            }
          })
        }
        
        if (email === adminEmail && password === adminPassword) {
          log('Fallback auth successful for admin user', { email }, 'info')
          return NextResponse.json({
            user: {
              id: "admin-user-id-456",
              name: "Admin User",
              email: adminEmail,
              role: "admin"
            }
          })
        }
        
        // Invalid credentials
        log('Fallback auth failed - invalid credentials', { email }, 'warn')
        return NextResponse.json({ error: 'CredentialsSignin' }, { status: 401 })
      } catch (error) {
        log('Error in fallback auth handler', { error: String(error) }, 'error')
        return NextResponse.json({ error: 'CredentialsSignin' }, { status: 401 })
      }
    }
    
    // If not in fallback mode, use the API
    const body = await request.json()
    
    // Make sure we have a properly formatted URL
    let apiUrl = process.env.API_BASE_URL || 'http://localhost:3001'
    
    // Remove trailing slash if present
    if (apiUrl.endsWith('/')) {
      apiUrl = apiUrl.slice(0, -1)
    }
    
    const fullUrl = `${apiUrl}/api/auth/login`
    
    log(`Forwarding credentials to ${fullUrl}`, { 
      email: body.email 
    }, 'info')
    
    try {
      const response = await fetch(fullUrl, {
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
      log('API credentials proxy error', { error: String(error) }, 'error')
      
      // If API is down, fallback to test users
      const { email, password } = body || {};
      const testEmail = process.env.TEST_USER_EMAIL || "test@example.com";
      const testPassword = process.env.TEST_USER_PASSWORD || "password123";
      const adminEmail = process.env.ADMIN_USER_EMAIL || "admin@example.com";
      const adminPassword = process.env.ADMIN_USER_PASSWORD || "admin123";
      
      if (email === testEmail && password === testPassword) {
        log('API down - using emergency fallback for test user', { email }, 'warn')
        return NextResponse.json({
          user: {
            id: "test-user-id-123",
            name: "Test User",
            email: testEmail,
          }
        })
      }
      
      if (email === adminEmail && password === adminPassword) {
        log('API down - using emergency fallback for admin user', { email }, 'warn')
        return NextResponse.json({
          user: {
            id: "admin-user-id-456",
            name: "Admin User",
            email: adminEmail,
            role: "admin"
          }
        })
      }
      
      return NextResponse.json(
        { error: 'CredentialsSignin' },
        { status: 401 }
      )
    }
  } catch (error) {
    log('Credentials route error', { error: String(error) }, 'error')
    return NextResponse.json(
      { error: 'CredentialsSignin' },
      { status: 401 }
    )
  }
}