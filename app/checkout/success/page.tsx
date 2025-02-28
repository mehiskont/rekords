"use client"

import { redirect } from "next/navigation"
import { Suspense, useEffect, useState, useRef } from "react"
import { SuccessContent } from "@/components/checkout/success-content"
import { Loader2, CheckCircle } from "lucide-react"
import { log } from "@/lib/logger"
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const dynamic = "force-dynamic"
export const revalidate = 0

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams()
  const [orderStatus, setOrderStatus] = useState<'loading' | 'success' | 'error'>('loading')
  // Use a ref to track if we've already processed this payment
  const processedRef = useRef(false)
  
  useEffect(() => {
    const paymentIntent = searchParams.get('payment_intent')
    
    // Only process once to prevent infinite loops
    if (paymentIntent && !processedRef.current) {
      processedRef.current = true
      
      console.log('Success page loaded with params:', JSON.stringify(Object.fromEntries(searchParams.entries())))
      // Here you would typically verify the payment status with your API
      // but for now we'll just set success
      setOrderStatus('success')
    }
  }, [searchParams]) // Dependency on searchParams is fine, we use the ref to prevent multiple executions
  
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

