import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendOrderConfirmationEmail(
  to: string,
  orderId: string,
  items: Array<{ title: string; quantity: number; price: number }>,
  total: number,
) {
  const subject = `Order Confirmation - #${orderId}`
  const html = `
    <h1>Thank you for your order!</h1>
    <p>Your order (ID: ${orderId}) has been confirmed and is being processed.</p>
    <h2>Order Details:</h2>
    <ul>
      ${items
        .map(
          (item) => `
        <li>${item.title} - Quantity: ${item.quantity} - Price: $${item.price.toFixed(2)}</li>
      `,
        )
        .join("")}
    </ul>
    <p><strong>Total: $${total.toFixed(2)}</strong></p>
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

