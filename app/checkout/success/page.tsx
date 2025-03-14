"use client"

import { useEffect, useState } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useSession } from 'next-auth/react'

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [orderId, setOrderId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { data: session } = useSession()
  
  useEffect(() => {
    // Fetch order details if we have a session ID
    if (sessionId) {
      fetch(`/api/order-details?id=${encodeURIComponent(sessionId)}`)
        .then(response => response.json())
        .then(data => {
          setOrderId(data.id || null)
          setIsLoading(false)
        })
        .catch(err => {
          console.error("Error fetching order details:", err)
          setIsLoading(false)
        })
    } else {
      setIsLoading(false)
    }
  }, [sessionId])

  return (
    <div className="container max-w-lg mx-auto py-12">
      <Card>
        <CardHeader className="text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <CardTitle className="text-2xl font-bold">Thank you for your order!</CardTitle>
          <CardDescription>Your order has been confirmed and will be shipped soon.</CardDescription>
        </CardHeader>
        
        <CardContent className="text-center">
          {isLoading ? (
            <div className="flex justify-center my-6">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : orderId ? (
            <div className="my-6 space-y-3">
              <p className="text-muted-foreground">Order ID: <span className="font-medium text-foreground">{orderId.substring(0, 8)}</span></p>
              <p className="text-sm text-muted-foreground">We've sent a confirmation email with your order details.</p>
            </div>
          ) : (
            <p className="my-6 text-sm text-muted-foreground">Your payment was successful and your order is being processed.</p>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-center gap-4">
          <Button asChild variant="outline">
            <Link href="/">Continue Shopping</Link>
          </Button>
          
          {session?.user ? (
            <Button asChild>
              <Link href="/dashboard/orders">View Your Orders</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/auth/signin?callbackUrl=/dashboard/orders">Sign In to View Orders</Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}