import { Resend } from "resend"
import { getOrderConfirmationEmail, getOrderShippedEmail } from "./templates"
import type { OrderDetails } from "@/types/order"
import { log } from "@/lib/logger"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendOrderConfirmationEmail(to: string, orderDetails: OrderDetails) {
  log(`Sending order confirmation email to ${to} for order ${orderDetails.orderId}`)
  
  try {
    const { data, error } = await resend.emails.send({
      from: "Plastik Records <orders@plastikrecords.com>",
      to: [to],
      subject: `Your Order Confirmation - #${orderDetails.orderId}`,
      html: getOrderConfirmationEmail(orderDetails),
      text: `Thank you for your order #${orderDetails.orderId}! We've received your order and are processing it. Total: $${orderDetails.total.toFixed(2)}`,
    })
    
    if (error) {
      log(`Failed to send order confirmation email: ${error}`, "error")
      return { success: false, error }
    }
    
    log(`Order confirmation email sent successfully. ID: ${data?.id}`)
    return { success: true, id: data?.id }
  } catch (error) {
    log(`Error sending order confirmation email: ${error instanceof Error ? error.message : String(error)}`, "error")
    // Don't throw error - return failure status instead
    return { success: false, error }
  }
}

export async function sendOrderShippedEmail(to: string, orderDetails: OrderDetails) {
  log(`Sending order shipped email to ${to} for order ${orderDetails.orderId}`)
  
  try {
    const { data, error } = await resend.emails.send({
      from: "Plastik Records <orders@plastikrecords.com>",
      to: [to],
      subject: `Your Order Has Been Shipped - #${orderDetails.orderId}`,
      html: getOrderShippedEmail(orderDetails),
      text: `Great news! Your order #${orderDetails.orderId} has been shipped and is on its way to you.`,
    })
    
    if (error) {
      log(`Failed to send order shipped email: ${error}`, "error")
      return { success: false, error }
    }
    
    log(`Order shipped email sent successfully. ID: ${data?.id}`)
    return { success: true, id: data?.id }
  } catch (error) {
    log(`Error sending order shipped email: ${error instanceof Error ? error.message : String(error)}`, "error")
    // Don't throw error - return failure status instead
    return { success: false, error }
  }
}

