import { redirect } from "next/navigation"
import { Suspense } from "react"
import { SuccessContent } from "@/components/checkout/success-content"
import { log } from "@/lib/logger"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default function SuccessPage({
  searchParams,
}: {
  searchParams: { payment_intent: string; payment_intent_client_secret: string; redirect_status: string }
}) {
  const { payment_intent, payment_intent_client_secret, redirect_status } = searchParams

  log(`Success page loaded with params: ${JSON.stringify(searchParams)}`)

  if (!payment_intent || !payment_intent_client_secret || redirect_status !== "succeeded") {
    log(`Invalid success page parameters: ${JSON.stringify(searchParams)}`, "error")
    redirect("/")
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuccessContent paymentIntentId={payment_intent} />
    </Suspense>
  )
}

