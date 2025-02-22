import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function CheckoutSuccessPage() {
  return (
    <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
      <h1 className="text-3xl font-bold mb-4">Thank you for your order!</h1>
      <p className="text-lg mb-8">Your order has been successfully placed and is being processed.</p>
      <Button asChild>
        <Link href="/">Continue Shopping</Link>
      </Button>
    </div>
  )
}

