"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Client component to avoid server-side data fetching issues
export default function OrderDetailsPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const orderId = params.id;

  useEffect(() => {
    async function fetchOrder() {
      try {
        const response = await fetch(`/api/order-details/?id=${orderId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.message || "Failed to load order details");
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        setOrder(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching order:", err);
        setError("An unexpected error occurred");
        setLoading(false);
      }
    }

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  // Status badge variant helper function
  const getStatusVariant = (status: string) => {
    if (!status) return "default";
    
    switch (status.toLowerCase()) {
      case "completed":
        return "success";
      case "paid":
        return "info";
      case "pending":
        return "warning";
      case "cancelled":
        return "destructive";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 py-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Order Details</h2>
          <Button variant="outline" asChild>
            <Link href="/dashboard/orders">Back to Orders</Link>
          </Button>
        </div>
        <Card>
          <CardContent className="py-10">
            <div className="flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
              <span className="ml-3">Loading order details...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
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
                
                <div className="space-y-4">
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
                  
                  {order.billingAddress?.taxDetails === "true" && (
                    <div>
                      <h3 className="font-medium mb-2">Tax Details</h3>
                      <div className="text-sm">
                        <p><span className="text-gray-500">Organization:</span> {order.billingAddress.organization}</p>
                        <p><span className="text-gray-500">Tax ID:</span> {order.billingAddress.taxId}</p>
                      </div>
                    </div>
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
                  {order.items.map((item: any) => (
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
                Subtotal ({order.items.reduce((acc: number, item: any) => acc + item.quantity, 0)} items)
              </div>
              <div className="font-medium">
                ${order.items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0).toFixed(2)}
              </div>
            </CardFooter>
          </Card>
          
          {/* Tax Details Card (shown only if tax details are available) */}
          {order.billingAddress?.taxDetails === "true" && (
            <Card>
              <CardHeader>
                <CardTitle>Tax Details</CardTitle>
                <CardDescription>
                  Information for tax and accounting purposes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="grid grid-cols-[140px_1fr] gap-1">
                    <span className="text-gray-500 font-medium">Organization:</span>
                    <span>{order.billingAddress.organization}</span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] gap-1">
                    <span className="text-gray-500 font-medium">Tax ID:</span>
                    <span>{order.billingAddress.taxId}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Order Total Card */}
          <Card>
            <CardHeader>
              <CardTitle>Order Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${order.items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0).toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>
                    ${(order.total - order.items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0)).toFixed(2)}
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
  );
}