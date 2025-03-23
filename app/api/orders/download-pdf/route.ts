import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getOrderById } from '@/lib/orders';
import { log } from '@/lib/logger';
import { formatDate } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get order ID from query params
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('id');

    if (!orderId) {
      return new NextResponse(JSON.stringify({ error: 'Order ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch order data
    const order = await getOrderById(orderId);

    if (!order) {
      return new NextResponse(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if order belongs to the current user
    if (order.userId !== session.user.id) {
      log(`Unauthorized PDF download attempt: ${orderId}, user: ${session.user.id}`, "warn");
      return new NextResponse(JSON.stringify({ error: 'You don\'t have permission to access this order' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate HTML for PDF
    const html = generateOrderPdfHtml(order);

    // Return PDF document
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="order-${orderId}.pdf"`
      }
    });
  } catch (error) {
    log('Error generating PDF:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to generate PDF' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function generateOrderPdfHtml(order: any) {
  const subtotal = order.items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
  const shipping = order.total - subtotal;
  
  // Function to format currency
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  
  // Detect pickup or delivery
  const isLocalPickup = order.billingAddress?.localPickup === true || order.billingAddress?.localPickup === "true";
  
  // Get status variant
  const getStatusVariant = (status: string) => {
    if (!status) return "default";
    
    switch (status.toLowerCase()) {
      case "completed":
        return "success";
      case "paid":
        return "info";
      case "pending":
        return "warning";
      case "cancelled":
        return "destructive";
      default:
        return "default";
    }
  };
  
  // Get CSS class for status badge
  const getStatusClass = (status: string) => {
    const variant = getStatusVariant(status);
    switch (variant) {
      case "success": return "status completed";
      case "info": return "status paid";
      case "warning": return "status pending";
      case "destructive": return "status cancelled";
      default: return "status";
    }
  };
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Order Receipt - ${order.id}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .order-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        .order-details, .shipping-details {
          flex: 1;
        }
        .order-id {
          font-family: monospace;
        }
        .status {
          display: inline-block;
          padding: 4px 8px;
          font-size: 12px;
          border-radius: 4px;
          background-color: #e2e8f0;
        }
        .status.completed { background-color: #c6f6d5; }
        .status.paid { background-color: #bee3f8; }
        .status.pending { background-color: #feebc8; }
        .status.cancelled { background-color: #fed7d7; }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th, td {
          text-align: left;
          padding: 12px;
          border-bottom: 1px solid #eee;
        }
        th {
          background-color: #f9fafb;
        }
        .text-right {
          text-align: right;
        }
        .total-row {
          font-weight: bold;
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          color: #666;
          font-size: 12px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }
        .free-shipping {
          color: #22c55e;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Plastik Records</div>
          <div>Order Receipt</div>
        </div>
        
        <div class="order-info">
          <div class="order-details">
            <h3>Order Information</h3>
            <p><strong>Order ID:</strong> <span class="order-id">${order.id}</span></p>
            <p><strong>Date:</strong> ${formatDate(order.createdAt)}</p>
            <p><strong>Status:</strong> <span class="${getStatusClass(order.status)}">${order.status}</span></p>
          </div>
          
          <div class="shipping-details">
            <h3>${isLocalPickup ? 'Delivery Method' : 'Shipping Address'}</h3>
            ${isLocalPickup ? `
              <p><strong>Local pickup from store</strong></p>
              <p>Please bring your ID when picking up your order.</p>
              <p><strong>Location:</strong> Plastik Records, 5 Main Street, Tallinn, Estonia</p>
              <p><strong>Store Hours:</strong> Monday-Friday 10am-7pm, Saturday 11am-5pm</p>
            ` : `
              <p>${order.shippingAddress?.name || ''}</p>
              <p>${order.shippingAddress?.email || ''}</p>
              <p>${order.shippingAddress?.address || 'No shipping address available'}</p>
            `}
          </div>
        </div>
        
        <h3>Order Items</h3>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Condition</th>
              <th class="text-right">Price</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map((item: any) => `
              <tr>
                <td>${item.title}</td>
                <td>${item.condition || 'N/A'}</td>
                <td class="text-right">${formatCurrency(item.price)}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">${formatCurrency(item.price * item.quantity)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="width: 300px; margin-left: auto;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>Subtotal:</span>
            <span>${formatCurrency(subtotal)}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>Shipping:</span>
            <span>${isLocalPickup ? 
              '<span class="free-shipping">Free (Local pick-up)</span>' : 
              formatCurrency(shipping)
            }</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; padding-top: 10px; border-top: 1px solid #eee;">
            <span>Total:</span>
            <span>${formatCurrency(order.total)}</span>
          </div>
        </div>
        
        ${order.billingAddress?.taxDetails === true || order.billingAddress?.taxDetails === "true" ? `
          <div style="margin-top: 30px;">
            <h3>Tax Details</h3>
            <p><strong>Organization:</strong> ${order.billingAddress.organization || 'N/A'}</p>
            <p><strong>Tax ID:</strong> ${order.billingAddress.taxId || 'N/A'}</p>
          </div>
        ` : ''}
        
        <div class="footer">
          <p>Thank you for your order!</p>
          <p>If you have any questions, please contact us at support@plastikrecords.com</p>
          <p>© ${new Date().getFullYear()} Plastik Records. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}