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
  
  // Calculate subtotal
  const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Calculate VAT (20% of subtotal)
  const vat = subtotal * 0.2;
  
  // Assume shipping cost is included in the total
  const shippingCost = parseFloat((order.total - subtotal - vat).toFixed(2)) || 2.99;

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
          .item { display: flex; margin: 15px 0; padding: 15px; background-color: #f5f5f5; border-radius: 4px; }
          .item-details { flex: 1; }
          .item-price { text-align: right; font-weight: bold; }
          .summary { background-color: #f5f5f5; padding: 20px; border-radius: 4px; margin-top: 30px; }
          .summary-row { display: flex; justify-content: space-between; margin: 8px 0; }
          .summary-total { display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
          .shipping { background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0; }
          h1 { color: #333; }
          h2 { font-size: 18px; color: #555; margin-top: 25px; }
          h3 { font-size: 16px; margin-bottom: 15px; }
          a { color: #4a6ee0; text-decoration: none; }
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
            <h3>Order Items:</h3>
            ${order.items
              .map(
                (item) => `
              <div class="item">
                <div class="item-details">
                  <strong>${item.title}</strong><br>
                  Quantity: ${item.quantity}<br>
                  ${item.condition ? `Condition: ${item.condition}<br>` : ""}
                </div>
                <div class="item-price">
                  $${(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            `,
              )
              .join("")}
          </div>
          
          <div class="summary">
            <h3>Order Summary:</h3>
            <div class="summary-row">
              <span>Items:</span>
              <span>${order.items.length}</span>
            </div>
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>$${subtotal.toFixed(2)}</span>
            </div>
            <div class="summary-row">
              <span>VAT (20%):</span>
              <span>$${vat.toFixed(2)}</span>
            </div>
            <div class="summary-row">
              <span>Shipping:</span>
              <span>$${shippingCost.toFixed(2)}</span>
            </div>
            <div class="summary-total">
              <span>Total:</span>
              <span>$${order.total.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="shipping">
            <h3>Shipping Address:</h3>
            <p>${formatAddress(order.shippingAddress)}</p>
          </div>
          
          <div class="footer">
            <p>Thank you for shopping with Plastik Records!</p>
            <p>If you have any questions about your order, please contact our support team.</p>
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

  // Calculate subtotal
  const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
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
          .item { display: flex; margin: 15px 0; padding: 15px; background-color: #f5f5f5; border-radius: 4px; }
          .item-details { flex: 1; }
          .item-price { text-align: right; font-weight: bold; }
          .summary { background-color: #f5f5f5; padding: 20px; border-radius: 4px; margin-top: 30px; }
          .summary-row { display: flex; justify-content: space-between; margin: 8px 0; }
          .summary-total { display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
          .shipping { background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .tracking { background-color: #e8f4ff; padding: 15px; border-radius: 4px; margin: 20px 0; text-align: center; font-size: 18px; font-weight: bold; }
          h1 { color: #333; }
          h2 { font-size: 18px; color: #555; margin-top: 25px; }
          h3 { font-size: 16px; margin-bottom: 15px; }
          a { color: #4a6ee0; text-decoration: none; }
          .shipping-icon { font-size: 48px; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="shipping-icon">📦</div>
            <h1>Your order has been shipped!</h1>
            <p>Order #${order.orderId}</p>
          </div>
          
          <p>Great news! Your order has been shipped and is on its way to you.</p>
          
          <div class="shipping">
            <h3>Shipping Address:</h3>
            <p>${formatAddress(order.shippingAddress)}</p>
          </div>
          
          <div class="items">
            <h3>Your Order Contains:</h3>
            ${order.items
              .map(
                (item) => `
              <div class="item">
                <div class="item-details">
                  <strong>${item.title}</strong><br>
                  Quantity: ${item.quantity}
                  ${item.condition ? `<br>Condition: ${item.condition}` : ""}
                </div>
              </div>
            `,
              )
              .join("")}
          </div>
          
          <div class="summary">
            <div class="summary-total">
              <span>Order Total:</span>
              <span>$${order.total.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="footer">
            <p>Thank you for shopping with Plastik Records!</p>
            <p>If you have any questions about your order, please contact our support team.</p>
            <p>&copy; ${new Date().getFullYear()} Plastik Records. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `
}