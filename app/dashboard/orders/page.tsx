import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getOrdersByUserId } from "@/lib/orders"
import { OrderList } from "@/components/dashboard/order-list"

export default async function OrdersPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/auth/signin")
  }
  
  let orders = []
  let dbError = false

  try {
    if (session?.user?.id) {
      orders = await getOrdersByUserId(session.user.id)
    }
  } catch (error) {
    console.error("Error fetching orders:", error)
    dbError = true
  }
  
  return (
    <div className="space-y-6 py-8">
      <h2 className="text-3xl font-bold tracking-tight">Your Orders</h2>
      
      {dbError ? (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900 p-6">
          <p className="text-yellow-800 dark:text-yellow-400">
            We're having trouble connecting to the database right now. Order history is temporarily unavailable.
          </p>
          <p className="text-yellow-700 dark:text-yellow-500 text-sm mt-2">
            Try refreshing the page in a few moments.
          </p>
        </div>
      ) : orders.length > 0 ? (
        <OrderList orders={orders} />
      ) : (
        <div className="rounded-lg border p-6 text-center">
          <p className="text-muted-foreground">You haven't placed any orders yet.</p>
        </div>
      )}
    </div>
  )
}

