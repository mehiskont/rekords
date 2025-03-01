import { redirect } from "next/navigation"
import Link from "next/link"
import Stripe from "stripe"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateDiscogsInventory } from "@/lib/discogs"
import { log } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { createOrder, updateOrderStatus } from "@/lib/orders"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: { session_id: string }
}) {
  const sessionId = searchParams.session_id

  if (!sessionId) {
    redirect("/")
  }
  
  log(`Success page loaded with session ID: ${sessionId}`)

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items", "payment_intent", "line_items.data.price.product"],
  })

  if (!session) {
    log(`No session found for ID: ${sessionId}`)
    redirect("/")
  }

  // Process the order immediately on the success page
  // This is a fallback in case the webhook doesn't trigger
  try {
    // Check if order exists
    let order = await prisma.order.findUnique({
      where: { stripeId: sessionId }
    });

    if (!order) {
      log(`No order found for session ${sessionId}, creating one now`);
      
      // Get items from session metadata
      const items = session.metadata?.items ? JSON.parse(session.metadata.items) : [];
      
      if (items.length === 0 && session.line_items?.data) {
        // If no items in metadata, reconstruct from line items
        const reconstructedItems = session.line_items.data.map(item => {
          const product = item.price?.product as Stripe.Product;
          return {
            id: product?.metadata?.discogsId || "unknown",
            title: product?.name || "Unknown Item",
            price: (item.amount_subtotal || 0) / 100,
            quantity: item.quantity || 1,
            condition: "Unknown"
          };
        });
        
        log(`Reconstructed ${reconstructedItems.length} items from line items`);
        
        // Create order
        order = await createOrder(
          session.metadata?.userId || "anonymous",
          reconstructedItems,
          session.shipping_details || session.customer_details,
          session.customer_details,
          sessionId
        );
        
        // Update order status
        await updateOrderStatus(order.id, "paid");
        
        // Update Discogs inventory
        for (const item of reconstructedItems) {
          try {
            log(`Updating Discogs inventory for item ${item.id}, quantity ${item.quantity}`);
            const updated = await updateDiscogsInventory(item.id.toString(), item.quantity || 1);
            log(updated ? 
              `Successfully updated Discogs inventory for item ${item.id}` : 
              `Failed to update Discogs inventory for item ${item.id}`
            );
          } catch (error) {
            log(`Error updating Discogs inventory: ${error instanceof Error ? error.message : String(error)}`, "error");
          }
        }
      } else if (items.length > 0) {
        // Create order from metadata items
        order = await createOrder(
          session.metadata?.userId || "anonymous",
          items,
          session.shipping_details || session.customer_details,
          session.customer_details,
          sessionId
        );
        
        // Update order status
        await updateOrderStatus(order.id, "paid");
        
        // Update Discogs inventory
        for (const item of items) {
          try {
            log(`Updating Discogs inventory for item ${item.id}, quantity ${item.quantity}`);
            const updated = await updateDiscogsInventory(item.id.toString(), item.quantity || 1);
            log(updated ? 
              `Successfully updated Discogs inventory for item ${item.id}` : 
              `Failed to update Discogs inventory for item ${item.id}`
            );
          } catch (error) {
            log(`Error updating Discogs inventory: ${error instanceof Error ? error.message : String(error)}`, "error");
          }
        }
      }
    } else {
      log(`Order already exists for session ${sessionId}: ${order.id}`);
    }
  } catch (error) {
    log(`Error processing order on success page: ${error instanceof Error ? error.message : String(error)}`, "error");
  }

  const customerEmail = session.customer_details?.email
  const total = session.amount_total ? (session.amount_total / 100).toFixed(2) : "0.00"
  const orderNumber = session.id.slice(-8).toUpperCase()

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Thank you for your order!</CardTitle>
          <CardDescription>We&apos;ve sent a confirmation email to {customerEmail}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-muted p-6">
            <h3 className="font-semibold mb-2">Order Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Order Number:</span>
                <span className="font-mono">{orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Total:</span>
                <span>${total}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-center">
            <p className="text-muted-foreground">
              {session.metadata?.createAccount === "true"
                ? "Your account has been created. Check your email for login instructions."
                : "Create an account to track your orders and get faster checkout next time."}
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild>
                <Link href="/">Continue Shopping</Link>
              </Button>
              {session.metadata?.createAccount !== "true" && (
                <Button variant="outline" asChild>
                  <Link href="/auth/signin">Sign In</Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

