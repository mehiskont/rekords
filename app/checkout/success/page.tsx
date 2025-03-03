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
    // Prevent infinite loop with useRef
    if (processedRef.current) return
    processedRef.current = true
    
    const paymentIntent = searchParams.get('payment_intent')
    const redirectStatus = searchParams.get('redirect_status')
    
    console.log(`Processing success page... payment_intent: ${paymentIntent}, redirect_status: ${redirectStatus}`);
    
    // If we don't have a payment intent, show success after a short delay
    if (!paymentIntent) {
      console.log('No payment intent found, assuming success');
      setTimeout(() => setOrderStatus('success'), 1500);
      return;
    }
    
    // Function to check payment/order status
    const checkOrderStatus = async (attempt = 1) => {
      try {
        // Fetch order details using payment intent
        const response = await fetch(`/api/order-details?paymentIntentId=${paymentIntent}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Order details retrieved:', data);
          
          if (data.error) {
            console.error('Error in order details:', data.error);
            // If we've reached max attempts, show error
            if (attempt >= maxAttempts) {
              setOrderStatus('error');
            } else {
              // Otherwise retry after delay
              setTimeout(() => checkOrderStatus(attempt + 1), 1000);
            }
          } else {
            // We have order details, show success
            setOrderStatus('success');
          }
        } else {
          console.error('Failed to retrieve order details, status:', response.status);
          // If we've reached max attempts, show success anyway
          if (attempt >= maxAttempts) {
            console.log('Max retry attempts reached, showing success anyway');
            setOrderStatus('success');
          } else {
            // Otherwise retry after delay
            setTimeout(() => checkOrderStatus(attempt + 1), 1000);
          }
        }
      } catch (error) {
        console.error('Error checking order status:', error);
        // If we've reached max attempts, show success anyway (failsafe)
        if (attempt >= maxAttempts) {
          console.log('Max retry attempts reached after error, showing success anyway');
          setOrderStatus('success');
        } else {
          // Otherwise retry after delay
          setTimeout(() => checkOrderStatus(attempt + 1), 1000);
        }
      }
    };
    
    // Start checking order status
    checkOrderStatus();
    
    // Failsafe timeout - show success after 15 seconds no matter what
    const failsafeTimer = setTimeout(() => {
      console.log('Failsafe timeout reached, showing success');
      setOrderStatus('success');
    }, 15000);
    
    return () => clearTimeout(failsafeTimer);
  }, [searchParams, maxAttempts])
  
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

