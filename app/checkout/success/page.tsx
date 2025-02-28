"use client"

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const dynamic = "force-dynamic"
export const revalidate = 0

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams()
  const [orderStatus, setOrderStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const processedRef = useRef(false)
  
  useEffect(() => {
    // Prevent infinite loop with useRef
    if (processedRef.current) return
    processedRef.current = true
    
    const paymentIntent = searchParams.get('payment_intent')
    const redirectStatus = searchParams.get('redirect_status')
    
    if (paymentIntent && redirectStatus === 'succeeded') {
      console.log(`Order successful with payment intent: ${paymentIntent}`)
      setOrderStatus('success')
    } else {
      setOrderStatus('error')
    }
  }, [searchParams])
  
  return (
    <div className="container max-w-md mx-auto py-12 text-center">
      {orderStatus === 'loading' && <p>Processing your order...</p>}
      
      {orderStatus === 'success' && (
        <div className="space-y-6">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
          <h1 className="text-2xl font-bold">Thank you for your order!</h1>
          <p>Your order has been confirmed and will be shipped soon.</p>
          <Button asChild>
            <Link href="/orders">View Your Orders</Link>
          </Button>
        </div>
      )}
      
      {orderStatus === 'error' && (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p>We couldn't process your order. Please contact support.</p>
          <Button asChild>
            <Link href="/contact">Contact Support</Link>
          </Button>
        </div>
      )}
    </div>
  )
}

