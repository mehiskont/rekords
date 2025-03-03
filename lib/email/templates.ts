import { OrderDetails } from "@/types/order"

export function getOrderConfirmationEmail(order: OrderDetails): string {
  // Helper function to format address safely
  const formatAddress = (address: any) => {
    if (!address) return '';
    
    // Handle various address formats that might come from Stripe
    const name = address.name || '';
    const line1 = address.line1 || address.address?.line1 || address.address || '';
    const line2 = address.line2 || address.address?.line2 || '';
    const city = address.city || '';
    const state = address.state || '';
    const postalCode = address.postal_code || address.postalCode || '';
    const country = address.country || '';
    
    return `
      ${name}<br>
      ${line1}<br>
      ${line2 ? `${line2}<br>` : ''}
      ${city}${state ? `, ${state}` : ''} ${postalCode}<br>
      ${country}
    `;
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Order Confirmation</title>
        <style>
          body { font-family: sans-serif; line-height: 1.5; color: #333; background-color: #f9f9f9; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
          .items { margin: 20px 0; }
          .item { margin: 10px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; }
          .total { font-size: 18px; font-weight: bold; margin: 20px 0; padding: 15px; background-color: #f0f0f0; border-radius: 4px; text-align: right; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
          .logo { margin-bottom: 20px; }
          .shipping { background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0; }
          h1 { color: #333; }
          h2 { font-size: 18px; color: #555; margin-top: 25px; }
          a { color: #4a6ee0; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">
              <img src="https://plastikrecords.com/logo.png" alt="Plastik Records" width="150" height="auto" style="max-width: 150px; height: auto;">
            </div>
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
            <p>${formatAddress(order.shippingAddress)}</p>
          </div>
          
          <div class="footer">
            <p>Thank you for shopping with Plastik Records!</p>
            <p>If you have any questions about your order, please contact our <a href="mailto:support@plastikrecords.com">support team</a>.</p>
            <p>&copy; ${new Date().getFullYear()} Plastik Records. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `
}

export function getOrderShippedEmail(order: OrderDetails): string {
  // Helper function to format address safely
  const formatAddress = (address: any) => {
    if (!address) return '';
    
    // Handle various address formats that might come from Stripe
    const name = address.name || '';
    const line1 = address.line1 || address.address?.line1 || address.address || '';
    const line2 = address.line2 || address.address?.line2 || '';
    const city = address.city || '';
    const state = address.state || '';
    const postalCode = address.postal_code || address.postalCode || '';
    const country = address.country || '';
    
    return `
      ${name}<br>
      ${line1}<br>
      ${line2 ? `${line2}<br>` : ''}
      ${city}${state ? `, ${state}` : ''} ${postalCode}<br>
      ${country}
    `;
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Order Shipped</title>
        <style>
          body { font-family: sans-serif; line-height: 1.5; color: #333; background-color: #f9f9f9; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
          .items { margin: 20px 0; }
          .item { margin: 10px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
          .logo { margin-bottom: 20px; }
          .shipping { background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0; }
          h1 { color: #333; }
          h2 { font-size: 18px; color: #555; margin-top: 25px; }
          a { color: #4a6ee0; text-decoration: none; }
          .shipping-icon { font-size: 48px; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">
              <img src="https://plastikrecords.com/logo.png" alt="Plastik Records" width="150" height="auto" style="max-width: 150px; height: auto;">
            </div>
            <div class="shipping-icon">📦</div>
            <h1>Your order is on its way!</h1>
            <p>Order #${order.orderId}</p>
          </div>
          
          <p>Great news! Your order has been shipped and is on its way to you.</p>
          
          <div class="shipping">
            <h2>Shipping Address:</h2>
            <p>${formatAddress(order.shippingAddress)}</p>
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
            <p>Thank you for shopping with Plastik Records!</p>
            <p>If you have any questions about your order, please contact our <a href="mailto:support@plastikrecords.com">support team</a>.</p>
            <p>&copy; ${new Date().getFullYear()} Plastik Records. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `
}