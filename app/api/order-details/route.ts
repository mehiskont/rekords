import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { log } from "@/lib/logger";
import { authOptions } from "@/lib/auth";
import { getOrderById } from "@/lib/orders";
import { normalizeTaxDetails } from "@/lib/utils";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const orderId = searchParams.get("id");
  const paymentIntentId = searchParams.get("paymentIntentId");

  // Handle payment intent lookups for old code paths
  if (paymentIntentId) {
    return handlePaymentIntent(paymentIntentId);
  }

  // Handle order details for new client component
  if (orderId) {
    return handleOrderDetails(orderId, request);
  }

  return NextResponse.json(
    { message: "Either id or paymentIntentId is required" },
    { status: 400 }
  );
}

// Handle order details lookup - supports both session IDs and order IDs
async function handleOrderDetails(orderId: string, request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const isSessionId = orderId.startsWith('cs_') || orderId.startsWith('pi_');
    
    // If it's a checkout session ID or payment intent ID, we allow access 
    // without authentication to support the checkout success page
    if (isSessionId) {
      const { prisma } = await import('@/lib/prisma');
      
      // Look up order by Stripe session ID
      const order = await prisma.order.findUnique({
        where: { stripeId: orderId },
        include: { items: true }
      });
      
      if (!order) {
        log(`Order not found for session/payment ID: ${orderId}`);
        return NextResponse.json({ message: "Order not found" }, { status: 404 });
      }
      
      // Normalize tax details to ensure they're strings
      const normalizedBillingAddress = order.billingAddress ? normalizeTaxDetails(order.billingAddress) : order.billingAddress;
      
      // Return the order with limited data for the success page
      return NextResponse.json({
        id: order.id,
        total: order.total,
        status: order.status,
        createdAt: order.createdAt,
        shippingAddress: order.shippingAddress,
        billingAddress: normalizedBillingAddress,
        items: order.items.map(item => ({
          title: item.title,
          quantity: item.quantity,
          price: item.price
        }))
      });
    }
    
    // For regular order IDs, require authentication
    if (!session?.user?.id) {
      log("Order details API accessed without valid session");
      return NextResponse.json(
        { message: "Authentication required" }, 
        { status: 401 }
      );
    }
    
    // Fetch order details
    const order = await getOrderById(orderId);
    
    // Check if order exists
    if (!order) {
      log(`Order not found: ${orderId}`);
      return NextResponse.json(
        { message: "Order not found" }, 
        { status: 404 }
      );
    }
    
    // Check if order belongs to the current user
    if (order.userId !== session.user.id) {
      log(`Unauthorized order access attempt: ${orderId}, user: ${session.user.id}`);
      return NextResponse.json(
        { message: "You don't have permission to view this order" }, 
        { status: 403 }
      );
    }
    
    // Return the order data
    return NextResponse.json(order);
    
  } catch (error) {
    log(`Error in order-details API: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    return NextResponse.json(
      { message: "Error fetching order details" }, 
      { status: 500 }
    );
  }
}

// Legacy handler for payment intent lookups
async function handlePaymentIntent(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    log(`Payment Intent retrieved: ${paymentIntent.id}`);

    if (paymentIntent.status !== "succeeded") {
      log(`Payment Intent not succeeded: ${paymentIntent.status}`, "error");
      return NextResponse.json({ error: "Payment not succeeded" }, { status: 400 });
    }

    const customerEmail = paymentIntent.receipt_email;
    const total = paymentIntent.amount ? (paymentIntent.amount / 100).toFixed(2) : "0.00";
    const orderNumber = paymentIntent.id.slice(-8).toUpperCase();

    const orderDetails = { customerEmail, total, orderNumber };
    log(`Order details: ${JSON.stringify(orderDetails)}`);

    return NextResponse.json(orderDetails);
  } catch (error) {
    log(`Error retrieving order details: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    return NextResponse.json({ error: "Failed to retrieve order details" }, { status: 500 });
  }
}

