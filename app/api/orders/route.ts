import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { log } from "@/lib/logger"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  // Get user ID from query params or session
  const url = new URL(request.url)
  const userId = url.searchParams.get("userId")
  
  try {
    // Get session
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      log("Orders API accessed without valid session")
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      )
    }
    
    // Ensure the user can only access their own orders
    const authenticatedUserId = session.user.id
    const targetUserId = userId || authenticatedUserId
    
    if (targetUserId !== authenticatedUserId) {
      log(`Unauthorized orders access attempt for user ${targetUserId} by ${authenticatedUserId}`)
      return NextResponse.json(
        { message: "You don't have permission to access these orders" },
        { status: 403 }
      )
    }
    
    // Directly query the database to ensure fresh results
    const orders = await prisma.order.findMany({
      where: { userId: targetUserId },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })
    
    log(`Retrieved ${orders.length} orders for user ${targetUserId}`)
    
    return NextResponse.json(orders)
  } catch (error) {
    log(`Error in orders API: ${error instanceof Error ? error.message : "Unknown error"}`, "error")
    return NextResponse.json(
      { message: "Error fetching orders" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const { items, customer } = await req.json()
    
    log(`Creating order with ${items.length} items for user ${customer.userId || 'anonymous'}`)

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
    
    log(`Order created successfully: ${order.id}`)

    return NextResponse.json({ orderId: order.id })
  } catch (error) {
    log("Error creating order:", error, "error")
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}

