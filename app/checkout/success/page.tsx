"use client"

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

// Remove these exports that are causing the error
// Using only one of these options is better - let's use dynamic
export const dynamic = "force-dynamic"
// The revalidate is causing the error, so remove it
// export const revalidate = 0

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
    
    // Show success even if no params (for testing)
    if (!paymentIntent && !redirectStatus) {
      console.log('No payment parameters found. Showing success page anyway.');
      // Set timeout to simulate processing
      const timer = setTimeout(() => {
        setOrderStatus('success');
      }, 1500);
      return () => clearTimeout(timer);
    }
    
    if (paymentIntent && redirectStatus === 'succeeded') {
      console.log(`Order successful with payment intent: ${paymentIntent}`);
      // Set timeout to ensure user sees the success state
      const timer = setTimeout(() => {
        setOrderStatus('success');
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      console.log(`Order status: ${redirectStatus || 'unknown'}`);
      setOrderStatus('error');
    }
  }, [searchParams])
  
  return (
    <div className="container max-w-md mx-auto py-12 text-center">
      {orderStatus === 'loading' && (
        <div className="space-y-4">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p>Processing your order...</p>
        </div>
      )}
      
      {orderStatus === 'success' && (
        <div className="space-y-6">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
          <h1 className="text-2xl font-bold">Thank you for your order!</h1>
          <p>Your order has been confirmed and will be shipped soon.</p>
          <Button asChild>
            <Link href="/dashboard/orders">View Your Orders</Link>
          </Button>
        </div>
      )}
      
      {orderStatus === 'error' && (
        <div className="space-y-6">
          <AlertCircle className="mx-auto h-16 w-16 text-red-500" />
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

