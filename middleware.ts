import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// This middleware ensures proper navigation to protected routes
export async function middleware(request: NextRequest) {
  // Get the pathname from the URL
  const path = request.nextUrl.pathname
  
  // Check if the request is for a protected route
  const isProtectedRoute = path.startsWith('/dashboard')
  
  // Skip if not a protected route
  if (!isProtectedRoute) return NextResponse.next()
  
  // Verify session/token existence
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })
  
  // Debug token information
  console.log(`Middleware check for ${path}:`, { 
    hasToken: !!token,
    userId: token?.userId || token?.sub
  })
  
  // Redirect to login if no token exists and page is protected
  if (!token && isProtectedRoute) {
    console.log(`Redirecting unauthenticated user from ${path} to login`)
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }
  
  // Allow the request to proceed
  return NextResponse.next()
}

// Only apply this middleware to specific paths
export const config = {
  matcher: [
    '/dashboard/:path*',
  ],
}