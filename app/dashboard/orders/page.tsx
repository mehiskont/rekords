import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { getOrdersByUserId } from "@/lib/orders"
import { OrderList } from "@/components/dashboard/order-list"

export default async function OrdersPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return null // This should be handled by the layout, but just in case
  }

  const orders = await getOrdersByUserId(session.user.id)

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Your Orders</h2>
      <OrderList orders={orders} />
    </div>
  )
}

