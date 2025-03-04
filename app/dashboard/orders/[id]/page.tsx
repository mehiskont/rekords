import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { getOrderById } from "@/lib/orders"
import { formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function OrderDetailsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const orderId = params.id
  
  if (!session) {
    redirect("/auth/signin")
  }
  
  let order = null
  let error = null
  
  try {
    order = await getOrderById(orderId)
    
    // Check if the order belongs to the current user or return error
    if (order && order.userId && order.userId !== session.user.id) {
      error = "You don't have permission to view this order"
      order = null
    }
  } catch (e) {
    console.error("Error fetching order:", e)
    error = "Error fetching order details"
  }
  
  // Get the status badge variant
  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "success"
      case "paid":
        return "info"
      case "pending":
        return "warning"
      case "cancelled":
        return "destructive"
      default:
        return "default"
    }
  }
  
  return (
    <div className="space-y-6 py-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Order Details</h2>
        <Button variant="outline" asChild>
          <Link href="/dashboard/orders">Back to Orders</Link>
        </Button>
      </div>
      
      {error ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
            <CardDescription>
              We encountered a problem
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" asChild>
              <Link href="/dashboard/orders">Back to Orders</Link>
            </Button>
          </CardFooter>
        </Card>
      ) : !order ? (
        <Card>
          <CardHeader>
            <CardTitle>Order Not Found</CardTitle>
            <CardDescription>
              The requested order could not be found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>The order with ID {orderId} does not exist or you don't have permission to view it.</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" asChild>
              <Link href="/dashboard/orders">Back to Orders</Link>
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid gap-6">
          {/* Order Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
              <CardDescription>
                Order placed on {formatDate(order.createdAt)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="font-medium mb-2">Order Information</h3>
                  <dl className="grid grid-cols-[100px_1fr] text-sm">
                    <dt className="text-gray-500 dark:text-gray-400">Order ID:</dt>
                    <dd className="font-mono">{order.id}</dd>
                    
                    <dt className="text-gray-500 dark:text-gray-400">Status:</dt>
                    <dd>
                      <Badge variant={getStatusVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </dd>
                    
                    <dt className="text-gray-500 dark:text-gray-400">Date:</dt>
                    <dd>{formatDate(order.createdAt)}</dd>
                    
                    <dt className="text-gray-500 dark:text-gray-400">Total:</dt>
                    <dd className="font-medium">${order.total.toFixed(2)}</dd>
                  </dl>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Shipping Address</h3>
                  {order.shippingAddress ? (
                    <address className="not-italic text-sm">
                      {order.shippingAddress.name && (
                        <p>{order.shippingAddress.name}</p>
                      )}
                      {order.shippingAddress.line1 && (
                        <p>{order.shippingAddress.line1}</p>
                      )}
                      {order.shippingAddress.line2 && (
                        <p>{order.shippingAddress.line2}</p>
                      )}
                      <p>
                        {order.shippingAddress.city && `${order.shippingAddress.city}, `}
                        {order.shippingAddress.state && `${order.shippingAddress.state} `}
                        {order.shippingAddress.postal_code}
                      </p>
                      <p>{order.shippingAddress.country}</p>
                    </address>
                  ) : (
                    <p className="text-sm text-gray-500">No shipping address available</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Order Items Card */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
              <CardDescription>
                Items included in this order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell>{item.condition || 'N/A'}</TableCell>
                      <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">${(item.price * item.quantity).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-between border-t p-6">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Subtotal ({order.items.reduce((acc, item) => acc + item.quantity, 0)} items)
              </div>
              <div className="font-medium">
                ${order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0).toFixed(2)}
              </div>
            </CardFooter>
          </Card>
          
          {/* Order Total Card */}
          <Card>
            <CardHeader>
              <CardTitle>Order Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0).toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>
                    ${(order.total - order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0)).toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between font-medium text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>${order.total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}