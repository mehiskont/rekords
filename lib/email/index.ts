import { Resend } from "resend"
import { getOrderConfirmationEmail, getOrderShippedEmail } from "./templates"
import type { OrderDetails } from "@/types/order"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendOrderConfirmationEmail(to: string, orderDetails: OrderDetails) {
  try {
    await resend.emails.send({
      from: "Plastik Record Store <orders@plastikrecords.com>",
      to: [to],
      subject: `Order Confirmation - #${orderDetails.orderId}`,
      html: getOrderConfirmationEmail(orderDetails),
    })
    console.log("Order confirmation email sent successfully")
  } catch (error) {
    console.error("Failed to send order confirmation email:", error)
    throw error
  }
}

export async function sendOrderShippedEmail(to: string, orderDetails: OrderDetails) {
  try {
    await resend.emails.send({
      from: "Plastik Record Store <orders@plastikrecords.com>",
      to: [to],
      subject: `Your Order Has Shipped - #${orderDetails.orderId}`,
      html: getOrderShippedEmail(orderDetails),
    })
    console.log("Order shipped email sent successfully")
  } catch (error) {
    console.error("Failed to send order shipped email:", error)
    throw error
  }
}

