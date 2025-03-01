import { prisma } from "@/lib/prisma"
import { updateDiscogsInventory } from "@/lib/discogs"
import { sendOrderConfirmationEmail, sendOrderShippedEmail } from "@/lib/email"
import type { CartItem } from "@/types/cart"
import type { OrderDetails, ShippingAddress } from "@/types/order"
import { log } from "@/lib/logger"

export async function createOrder(
  userId: string,
  items: CartItem[],
  shippingAddress: any,
  billingAddress: any,
  stripeSessionId: string,
) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const order = await prisma.order.create({
    data: {
      userId,
      total,
      stripeId: stripeSessionId,
      shippingAddress,
      billingAddress,
      items: {
        create: items.map((item) => ({
          discogsId: item.id.toString(),
          title: item.title,
          price: item.price,
          quantity: item.quantity,
          condition: item.condition,
        })),
      },
    },
    include: {
      items: true,
      user: true,
    },
  })

  // Remove items from Discogs inventory
  for (const item of items) {
    try {
      log(`Updating Discogs inventory for item ${item.id}, quantity ${item.quantity}`)
      await updateDiscogsInventory(item.id.toString(), item.quantity || 1)
      log(`Successfully updated Discogs inventory for item ${item.id}`)
    } catch (error) {
      log(`Failed to update Discogs inventory for item ${item.id}: ${error instanceof Error ? error.message : String(error)}`, "error")
    }
  }

  // Send order confirmation email
  if (order.user.email) {
    const orderDetails: OrderDetails = {
      orderId: order.id,
      items: order.items.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        price: item.price,
        condition: item.condition || undefined,
      })),
      total: order.total,
      shippingAddress: shippingAddress as ShippingAddress,
    }

    await sendOrderConfirmationEmail(order.user.email, orderDetails)
  }

  return order
}

export async function updateOrderStatus(orderId: string, status: string) {
  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status },
    include: {
      items: true,
      user: true,
    },
  })

  // Send order shipped email when status changes to "shipped"
  if (status === "shipped" && order.user.email) {
    const orderDetails: OrderDetails = {
      orderId: order.id,
      items: order.items.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        price: item.price,
        condition: item.condition || undefined,
      })),
      total: order.total,
      shippingAddress: order.shippingAddress as ShippingAddress,
    }

    await sendOrderShippedEmail(order.user.email, orderDetails)
  }

  return order
}

export async function getOrdersByUserId(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    include: {
      items: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}

export async function getOrderById(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
    },
  })
}

