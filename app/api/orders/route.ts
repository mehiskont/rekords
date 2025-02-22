import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const { items, customer } = await req.json()

    const order = await prisma.order.create({
      data: {
        total: items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0),
        status: "pending",
        userId: customer.userId,
        shippingAddress: customer,
        items: {
          create: items.map((item: any) => ({
            discogsId: item.id.toString(),
            title: item.title,
            price: item.price,
            quantity: item.quantity,
            condition: item.condition,
          })),
        },
      },
    })

    return NextResponse.json({ orderId: order.id })
  } catch (error) {
    console.error("Error creating order:", error)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}

