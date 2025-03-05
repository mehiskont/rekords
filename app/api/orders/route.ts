import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { log } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { getOrdersByUserId } from "@/lib/orders"
import { mockOrders, getMockOrdersForUser, adminMockOrders } from "@/lib/mock-data/orders"

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
    
    try {
      // Use direct database connection config to avoid issues
      const orders = await getOrdersByUserId(targetUserId);
      
      log(`Retrieved ${orders.length} orders for user ${targetUserId}`)
      return NextResponse.json(orders)
    } catch (dbError) {
      // If database query fails, use mock data
      log("Database fetch failed, using mock orders", dbError, "warn")
      
      // Get mock orders for this specific user - check ID or if someone is using Gmail
      let userMockOrders = getMockOrdersForUser(authenticatedUserId);
      
      // Special handling for Google auth users who should see the admin mock orders
      // Typically users would be identified by their database ID, but in the fallback mode, 
      // Google auth users get a dynamically generated ID prefixed with 'google-'
      const isGoogleAuthUser = authenticatedUserId.startsWith('google-');
      const userEmail = url.searchParams.get("email") || '';
      
      // If it's a Gmail user, they get admin mock orders if they have none
      if (isGoogleAuthUser && userEmail.includes('@gmail.com') && userMockOrders.length === 0) {
        log(`Google user detected (${userEmail}), showing admin mock orders`);
        userMockOrders = adminMockOrders;
      }
      
      // If user has no associated mock orders and the includeMock parameter is true,
      // return test mock orders as a fallback for debugging
      const filteredMockOrders = userMockOrders.length > 0 ? 
        userMockOrders : 
        (url.searchParams.get("includeMock") === "true" ? mockOrders : []);
      
      log(`Returning ${filteredMockOrders.length} mock orders for ${authenticatedUserId}`)
      return NextResponse.json(filteredMockOrders)
    }
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

    try {
      // Verify database connection first
      await prisma.$queryRaw`SELECT 1 as database_test`;
      
      // Try to create an order in the database first
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
    } catch (dbError) {
      // If database is unavailable, create a mock order with a fake ID
      log("Database unavailable, creating mock order", dbError, "warn")
      
      const mockOrderId = `mock-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      
      // Add to mock orders for this session
      mockOrders.push({
        id: mockOrderId,
        userId: customer.userId || "anonymous",
        status: "pending",
        total: items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        shippingAddress: customer,
        items: items.map((item: any, index: number) => ({
          id: `mock-item-${Date.now()}-${index}`,
          orderId: mockOrderId,
          discogsId: item.id.toString(),
          title: item.title,
          price: item.price,
          quantity: item.quantity,
          condition: item.condition || "Not specified",
        })),
      })
      
      log(`Mock order created: ${mockOrderId}`)
      return NextResponse.json({ orderId: mockOrderId })
    }
  } catch (error) {
    log("Error creating order:", error, "error")
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}

