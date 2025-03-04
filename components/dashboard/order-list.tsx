import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Order {
  id: string
  createdAt: Date
  status: string
  total: number
}

interface OrderListProps {
  orders: Order[]
}

export function OrderList({ orders }: OrderListProps) {
  // Status badge variants
  const getStatusVariant = (status: string) => {
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
  }
  
  // Format order ID to be shorter and more readable
  const formatOrderId = (id: string) => {
    return id.substring(0, 8);
  }
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>
                <Link href={`/dashboard/orders/${order.id}`} className="font-medium hover:underline">
                  {formatOrderId(order.id)}
                </Link>
              </TableCell>
              <TableCell>{formatDate(order.createdAt)}</TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
              </TableCell>
              <TableCell className="text-right">${order.total.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

