'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/components/ui/use-toast'

/**
 * Component that handles cart merging after login
 * This is a client-side only component
 */
export default function CartMergeHandler() {
  const { data: session } = useSession()
  const { toast } = useToast()

  useEffect(() => {
    // Check if user just logged in and has cart data to merge
    const shouldMergeCart = session && (session as any)?.shouldMergeCart
    const hasLoginTimestamp = typeof localStorage !== 'undefined' && 
                             localStorage.getItem('plastik-cart-login-time')
    
    if (shouldMergeCart && hasLoginTimestamp) {
      const mergeCart = async () => {
        try {
          // Get guest cart items from localStorage
          const cartData = localStorage.getItem('plastik-cart')
          if (!cartData) return
          
          const cart = JSON.parse(cartData)
          if (!cart.items || cart.items.length === 0) return
          
          console.log('Merging cart after login', { itemCount: cart.items.length })
          
          // Call the cart merge API
          const response = await fetch('/api/cart-merge', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              guestCartItems: cart.items
            })
          })
          
          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(errorText)
          }
          
          const result = await response.json()
          
          // Clear the cart merge timestamp
          localStorage.removeItem('plastik-cart-login-time')
          
          // Notify user of successful merge
          toast({
            title: 'Cart updated',
            description: `Your guest cart has been merged with your account.`,
            duration: 3000
          })
          
          console.log('Cart merge completed successfully', result)
        } catch (error) {
          console.error('Error merging cart', error)
          toast({
            title: 'Cart merge failed',
            description: 'We could not merge your cart items. Please try again later.',
            variant: 'destructive'
          })
        }
      }
      
      mergeCart()
    }
  }, [session, toast])
  
  // This component doesn't render anything visible
  return null
}