import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendOrderConfirmationEmail(to: string, orderDetails: any) {
  const subject = `Order Confirmation - #${orderDetails.orderId}`
  const html = `
    <h1>Thank you for your order!</h1>
    <p>Your order (ID: ${orderDetails.orderId}) has been confirmed and is being processed.</p>
    <h2>Order Details:</h2>
    <ul>
      ${orderDetails.items
        .map(
          (item: any) => `
        <li>${item.title} - Quantity: ${item.quantity} - Price: $${item.price.toFixed(2)}</li>
      `,
        )
        .join("")}
    </ul>
    <p><strong>Total: $${orderDetails.total.toFixed(2)}</strong></p>
    <p>We'll send you another email when your order ships.</p>
    <p>Thank you for shopping with us!</p>
  `

  try {
    await resend.emails.send({
      from: "Plastik Record Store <orders@plastikrecords.com>",
      to: [to],
      subject: subject,
      html: html,
    })
    console.log("Order confirmation email sent successfully")
  } catch (error) {
    console.error("Failed to send order confirmation email:", error)
  }
}

export async function sendOrderShippedEmail(to: string, orderDetails: any) {
  const subject = `Your Order Has Shipped - #${orderDetails.orderId}`
  const html = `
    <h1>Your order is on its way!</h1>
    <p>Great news! Your order has been shipped and is on its way to you.</p>
    <h2>Shipping Address:</h2>
    <p>
      ${orderDetails.shippingAddress.name}<br>
      ${orderDetails.shippingAddress.line1}<br>
      ${orderDetails.shippingAddress.line2 ? `${orderDetails.shippingAddress.line2}<br>` : ""}
      ${orderDetails.shippingAddress.city}${orderDetails.shippingAddress.state ? `, ${orderDetails.shippingAddress.state}` : ""} ${orderDetails.shippingAddress.postalCode}<br>
      ${orderDetails.shippingAddress.country}
    </p>
    <h2>Order Contents:</h2>
    <ul>
      ${orderDetails.items
        .map(
          (item: any) => `
        <li>${item.title} - Quantity: ${item.quantity}</li>
      `,
        )
        .join("")}
    </ul>
    <p>Thank you for shopping with Plastik Record Store!</p>
  `

  try {
    await resend.emails.send({
      from: "Plastik Record Store <orders@plastikrecords.com>",
      to: [to],
      subject: subject,
      html: html,
    })
    console.log("Order shipped email sent successfully")
  } catch (error) {
    console.error("Failed to send order shipped email:", error)
  }
}

