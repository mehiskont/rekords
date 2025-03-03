import { NextResponse } from "next/server"
import { z } from "zod"
import { sendOrderConfirmationEmail, sendOrderShippedEmail } from "@/lib/email"
import { log } from "@/lib/logger"

const testEmailSchema = z.object({
  email: z.string().email(),
  type: z.enum(["confirmation", "shipped"]),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, type } = testEmailSchema.parse(body)
    
    // Sample order data for test emails
    const testOrderDetails = {
      orderId: "TEST1234",
      items: [
        {
          title: "Test Vinyl Record - Awesome Album",
          quantity: 1,
          price: 24.99,
          condition: "Mint (M)"
        },
        {
          title: "Another Great Record - Limited Edition",
          quantity: 2,
          price: 29.99,
          condition: "Near Mint (NM)"
        }
      ],
      total: 84.97,
      shippingAddress: {
        name: "Test Customer",
        line1: "123 Test Street",
        line2: "Apt 5",
        city: "Test City",
        state: "TS",
        postal_code: "12345",
        country: "Test Country"
      }
    }
    
    let result;
    if (type === "confirmation") {
      log(`Sending test order confirmation email to ${email}`)
      result = await sendOrderConfirmationEmail(email, testOrderDetails)
    } else {
      log(`Sending test order shipped email to ${email}`)
      result = await sendOrderShippedEmail(email, testOrderDetails)
    }
    
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Test ${type} email sent successfully to ${email}`,
      id: result.id
    })
  } catch (error) {
    log(`Error sending test email: ${error instanceof Error ? error.message : String(error)}`, "error")
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 400 })
  }
}