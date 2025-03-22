import { getServerSession } from "next-auth/next"
import { OrderList } from "@/components/dashboard/order-list"
import { getOrdersByUserId } from "@/lib/orders"
import { authOptions } from "@/lib/auth"
import { mockOrders } from "@/lib/mock-data/orders"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  console.log("Dashboard page session:", {
    hasSession: !!session,
    sessionData: session ? {
      userId: session.user?.id,
      name: session.user?.name,
      email: session.user?.email ? `${session.user.email.substring(0, 3)}...` : null,
    } : null
  });
  
  let orders = [];
  let dbError = false;

  // Try to get user orders, but handle database connection errors gracefully
  try {
    if (session?.user?.id) {
      // Get user orders with a limit of 5 for the dashboard preview
      orders = await getOrdersByUserId(session.user.id, 5);
    }
  } catch (error) {
    console.error("Error fetching orders:", error);
    dbError = true;
    
    // Fallback to mock data (which is empty) if DB connection fails
    orders = mockOrders;
  }

  return (
    <div className="flex-1 space-y-6 pb-6 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      
      {/* Welcome section */}
      <div className="rounded-lg border p-6 shadow-sm">
        <h3 className="text-xl font-semibold mb-4">Welcome, {session?.user?.name || 'Vinyl Enthusiast'}!</h3>
        <p className="text-muted-foreground mb-2">
          From your dashboard, you can view your order history and manage your profile.
        </p>
      </div>
      
      {/* Order history section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Recent Orders</h3>
          {orders.length > 0 && (
            <a href="/dashboard/orders" className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
              View all orders →
            </a>
          )}
        </div>
        
        {dbError ? (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900 p-6 text-center">
            <p className="text-yellow-800 dark:text-yellow-400">
              We're having trouble connecting to the database right now. Order history is temporarily unavailable.
            </p>
            <p className="text-yellow-700 dark:text-yellow-500 text-sm mt-2">
              Try refreshing the page in a few moments.
            </p>
          </div>
        ) : orders.length > 0 ? (
          <>
            <OrderList orders={orders} />
            <div className="text-center mt-2">
              <a href="/dashboard/orders" className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 md:hidden inline-block">
                View all orders →
              </a>
            </div>
          </>
        ) : (
          <div className="rounded-lg border p-6 text-center">
            <p className="text-muted-foreground">You haven't placed any orders yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}

