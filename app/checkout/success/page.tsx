"use client"

import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function CheckoutSuccessPage() {
  return (
    <div className="container max-w-md mx-auto py-12 text-center">
      <div className="space-y-6">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
        <h1 className="text-2xl font-bold">Thank you for your order!</h1>
        <p>Your order has been confirmed and will be shipped soon.</p>
        <Button asChild>
          <Link href="/dashboard/orders">View Your Orders</Link>
        </Button>
      </div>
    </div>
  )
}