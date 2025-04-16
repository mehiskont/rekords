import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { log } from '@/lib/logger'

/**
 * API route to merge guest cart with user cart after login
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get session to verify user is authenticated
    const session = await getServerSession(req, res, authOptions)
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    // Get the guest cart items from the request body
    const { guestCartItems } = req.body
    
    if (!guestCartItems || !Array.isArray(guestCartItems)) {
      return res.status(400).json({ error: 'Invalid guest cart data' })
    }
    
    // Log the cart merging attempt
    log('Merging guest cart with user cart', {
      userId: session.user.id,
      itemCount: guestCartItems.length
    }, 'info')
    
    // Forward to backend API
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL
    if (!apiUrl) {
      return res.status(500).json({ error: 'Backend API URL not configured' })
    }
    
    const response = await fetch(`${apiUrl}/api/cart/merge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || ''
      },
      body: JSON.stringify({
        userId: session.user.id,
        guestCartItems
      })
    })
    
    // Forward the response from the backend
    const data = await response.json()
    return res.status(response.status).json(data)
  } catch (error) {
    log('Error in cart merge endpoint', { error }, 'error')
    return res.status(500).json({ error: 'Internal server error' })
  }
}