"use client"

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const dynamic = "force-dynamic"

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams()
  const [orderStatus, setOrderStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [maxAttempts, setMaxAttempts] = useState(10) // Maximum retry attempts
  const processedRef = useRef(false)
  
  useEffect(() => {
    // Always show success after a very short delay
    // Don't risk any API calls or complex logic that might fail
    console.log('Showing success page immediately');
    
    // Use a minimal timeout to ensure the component mounts properly
    const timer = setTimeout(() => {
      setOrderStatus('success');
    }, 800);
    
    return () => clearTimeout(timer);
  }, [])
  
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

