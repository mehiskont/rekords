"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface OrderDetails {
  customerEmail: string | null
  total: string
  orderNumber: string
}

export function SuccessContent({ paymentIntentId }: { paymentIntentId: string }) {
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const response = await fetch(`/api/order-details?paymentIntentId=${paymentIntentId}`)
        if (!response.ok) {
          throw new Error("Failed to fetch order details")
        }
        const data = await response.json()
        setOrderDetails(data)
      } catch (err) {
        setError("An error occurred while fetching order details. Please contact support.")
        console.error("Error fetching order details:", err)
      }
    }

    fetchOrderDetails()
  }, [paymentIntentId])

  useEffect(() => {
    router.replace(`/checkout/success?payment_intent=${paymentIntentId}`)
  }, [router, paymentIntentId])

  if (error) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Oops! Something went wrong</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4 justify-center">
              <Button asChild>
                <Link href="/">Return to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!orderDetails) {
    return <div>Loading order details...</div>
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Thank you for your order!</CardTitle>
          <CardDescription>
            {orderDetails.customerEmail
              ? `We've sent a confirmation email to ${orderDetails.customerEmail}`
              : "Your order has been confirmed"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-muted p-6">
            <h3 className="font-semibold mb-2">Order Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Order Number:</span>
                <span className="font-mono">{orderDetails.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Total:</span>
                <span>${orderDetails.total}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-center">
            <p className="text-muted-foreground">Your order has been successfully placed and is being processed.</p>
            <div className="flex gap-4 justify-center">
              <Button asChild>
                <Link href="/">Continue Shopping</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

