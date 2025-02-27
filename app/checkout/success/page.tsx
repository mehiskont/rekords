import { redirect } from "next/navigation"
import { Suspense } from "react"
import { SuccessContent } from "@/components/checkout/success-content"
import { Loader2 } from "lucide-react"
import { log } from "@/lib/logger"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default function SuccessPage({
  searchParams,
}: {
  searchParams: { payment_intent: string; payment_intent_client_secret?: string; redirect_status?: string }
}) {
  const { payment_intent } = searchParams

  log(`Success page loaded with params: ${JSON.stringify(searchParams)}`)

  if (!payment_intent) {
    log(`Invalid success page parameters: ${JSON.stringify(searchParams)}`, "error")
    redirect("/")
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-12">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading order details...</p>
          </div>
        }
      >
        <SuccessContent paymentIntentId={payment_intent} />
      </Suspense>
    </div>
  )
}

