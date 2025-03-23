import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getOrderById } from '@/lib/orders';
import { log } from '@/lib/logger';
import { formatDate } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

    // Generate PDF
    const pdf = generateOrderPdf(order);
    
    // Return PDF document
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
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

function generateOrderPdf(order: any) {
  // Create a new PDF document
  const doc = new jsPDF();
  
  // Function to format currency
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  
  // Detect pickup or delivery
  const isLocalPickup = order.billingAddress?.localPickup === true || order.billingAddress?.localPickup === "true";
  
  // Calculate subtotal and shipping
  const subtotal = order.items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
  const shipping = order.total - subtotal;

  // Add header
  doc.setFontSize(20);
  doc.text('Plastik Records', 105, 20, { align: 'center' });
  doc.setFontSize(14);
  doc.text('Order Receipt', 105, 30, { align: 'center' });
  doc.line(20, 35, 190, 35);
  
  // Add order information
  doc.setFontSize(12);
  doc.text('Order Information', 20, 45);
  doc.setFontSize(10);
  doc.text(`Order ID: ${order.id}`, 20, 55);
  doc.text(`Date: ${formatDate(order.createdAt)}`, 20, 62);
  doc.text(`Status: ${order.status}`, 20, 69);
  
  // Add shipping information
  doc.setFontSize(12);
  doc.text(isLocalPickup ? 'Delivery Method' : 'Shipping Address', 120, 45);
  doc.setFontSize(10);
  
  if (isLocalPickup) {
    doc.text('Local pickup from store', 120, 55);
    doc.text('Please bring your ID when picking up your order.', 120, 62);
    doc.text('Location: Plastik Records, 5 Main Street, Tallinn, Estonia', 120, 69);
    doc.text('Store Hours: Monday-Friday 10am-7pm, Saturday 11am-5pm', 120, 76);
  } else if (order.shippingAddress) {
    const shippingLines = [];
    if (order.shippingAddress.name) shippingLines.push(order.shippingAddress.name);
    if (order.shippingAddress.email) shippingLines.push(order.shippingAddress.email);
    if (order.shippingAddress.address) shippingLines.push(order.shippingAddress.address);
    
    if (shippingLines.length > 0) {
      let yPos = 55;
      shippingLines.forEach(line => {
        doc.text(line, 120, yPos);
        yPos += 7;
      });
    } else {
      doc.text('No shipping address available', 120, 55);
    }
  } else {
    doc.text('No shipping address available', 120, 55);
  }
  
  // Add order items table
  doc.setFontSize(12);
  doc.text('Order Items', 20, 90);
  
  // Prepare table data
  const tableHeaders = [['Item', 'Condition', 'Price', 'Qty', 'Subtotal']];
  const tableData = order.items.map((item: any) => [
    item.title,
    item.condition || 'N/A',
    formatCurrency(item.price),
    item.quantity.toString(),
    formatCurrency(item.price * item.quantity)
  ]);
  
  // Add table
  autoTable(doc, {
    head: tableHeaders,
    body: tableData,
    startY: 95,
    theme: 'grid',
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 70 },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' }
    }
  });
  
  // Get the final Y position after the table
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  // Add order totals
  doc.setFontSize(10);
  doc.text('Subtotal:', 140, finalY);
  doc.text(formatCurrency(subtotal), 190, finalY, { align: 'right' });
  
  doc.text('Shipping:', 140, finalY + 7);
  if (isLocalPickup) {
    doc.setTextColor(34, 197, 94); // Green color for free shipping
    doc.text('Free (Local pick-up)', 190, finalY + 7, { align: 'right' });
    doc.setTextColor(0, 0, 0); // Reset to black
  } else {
    doc.text(formatCurrency(shipping), 190, finalY + 7, { align: 'right' });
  }
  
  doc.line(140, finalY + 10, 190, finalY + 10);
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Total:', 140, finalY + 17);
  doc.text(formatCurrency(order.total), 190, finalY + 17, { align: 'right' });
  doc.setFont(undefined, 'normal');
  
  // Add tax details if applicable
  if (order.billingAddress?.taxDetails === true || order.billingAddress?.taxDetails === "true") {
    doc.setFontSize(12);
    doc.text('Tax Details', 20, finalY + 30);
    doc.setFontSize(10);
    doc.text(`Organization: ${order.billingAddress.organization || 'N/A'}`, 20, finalY + 37);
    doc.text(`Tax ID: ${order.billingAddress.taxId || 'N/A'}`, 20, finalY + 44);
  }
  
  // Add footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for your order!', 105, pageHeight - 30, { align: 'center' });
  doc.text('If you have any questions, please contact us at support@plastikrecords.com', 105, pageHeight - 25, { align: 'center' });
  doc.text(`© ${new Date().getFullYear()} Plastik Records. All rights reserved.`, 105, pageHeight - 20, { align: 'center' });
  
  // Return the generated PDF
  return doc.output('arraybuffer');
}