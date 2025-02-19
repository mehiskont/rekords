interface OrderItem {
  title: string
  quantity: number
  price: number
  condition?: string
}

interface OrderDetails {
  orderId: string
  items: OrderItem[]
  total: number
  shippingAddress: {
    name: string
    line1: string
    line2?: string
    city: string
    state?: string
    postal_code: string
    country: string
  }
}

export function getOrderConfirmationEmail(order: OrderDetails): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Order Confirmation</title>
        <style>
          body { font-family: sans-serif; line-height: 1.5; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .items { margin: 20px 0; }
          .item { margin: 10px 0; }
          .total { font-size: 18px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Thank you for your order!</h1>
            <p>Order #${order.orderId}</p>
          </div>
          
          <p>We're excited to confirm your order. Here are your order details:</p>
          
          <div class="items">
            ${order.items
              .map(
                (item) => `
              <div class="item">
                <strong>${item.title}</strong><br>
                Quantity: ${item.quantity}<br>
                Price: $${item.price.toFixed(2)}
                ${item.condition ? `<br>Condition: ${item.condition}` : ""}
              </div>
            `,
              )
              .join("")}
          </div>
          
          <div class="total">
            Total: $${order.total.toFixed(2)}
          </div>
          
          <div class="shipping">
            <h2>Shipping Address:</h2>
            <p>
              ${order.shippingAddress.name}<br>
              ${order.shippingAddress.line1}<br>
              ${order.shippingAddress.line2 ? `${order.shippingAddress.line2}<br>` : ""}
              ${order.shippingAddress.city}${order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ""} ${order.shippingAddress.postal_code}<br>
              ${order.shippingAddress.country}
            </p>
          </div>
          
          <div class="footer">
            <p>Thank you for shopping with Plastik Record Store!</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
    </html>
  `
}

export function getOrderShippedEmail(order: OrderDetails): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Order Shipped</title>
        <style>
          body { font-family: sans-serif; line-height: 1.5; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .items { margin: 20px 0; }
          .item { margin: 10px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your order is on its way!</h1>
            <p>Order #${order.orderId}</p>
          </div>
          
          <p>Great news! Your order has been shipped and is on its way to you.</p>
          
          <div class="shipping">
            <h2>Shipping Address:</h2>
            <p>
              ${order.shippingAddress.name}<br>
              ${order.shippingAddress.line1}<br>
              ${order.shippingAddress.line2 ? `${order.shippingAddress.line2}<br>` : ""}
              ${order.shippingAddress.city}${order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ""} ${order.shippingAddress.postal_code}<br>
              ${order.shippingAddress.country}
            </p>
          </div>
          
          <div class="items">
            <h2>Order Contents:</h2>
            ${order.items
              .map(
                (item) => `
              <div class="item">
                <strong>${item.title}</strong> (Qty: ${item.quantity})
              </div>
            `,
              )
              .join("")}
          </div>
          
          <div class="footer">
            <p>Thank you for shopping with Plastik Record Store!</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
    </html>
  `
}

