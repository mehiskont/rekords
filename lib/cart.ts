import { prisma } from "./prisma";
import type { DiscogsRecord } from "@/types/discogs";
import { cookies } from 'next/headers';
import crypto from 'crypto';

// Generate a random ID for guest carts without external dependencies
function generateId(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Cookie name for guest cart ID
const GUEST_CART_COOKIE = "plastik_guest_cart_id";

// Get or create cart based on user or guest ID
export async function getOrCreateCart(userId?: string) {
  // If user is logged in, try to find their cart
  if (userId) {
    const existingCart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });

    if (existingCart) {
      return existingCart;
    }

    // Create new cart for the user - don't provide empty items array
    return prisma.cart.create({
      data: {
        userId,
      },
      include: { items: true },
    });
  }

  // For guest users, use a cookie-based ID
  const cookieStore = cookies();
  let guestId = cookieStore.get(GUEST_CART_COOKIE)?.value;

  // If no guest ID exists, create one and set the cookie
  if (!guestId) {
    guestId = generateId();
    cookieStore.set(GUEST_CART_COOKIE, guestId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
    });
  }

  // Try to find an existing cart for this guest
  const existingGuestCart = await prisma.cart.findUnique({
    where: { guestId },
    include: { items: true },
  });

  if (existingGuestCart) {
    return existingGuestCart;
  }

  // Create new cart for the guest - don't provide empty items array
  return prisma.cart.create({
    data: {
      guestId,
    },
    include: { items: true },
  });
}

// Add item to cart
export async function addToCart(cartId: string, item: DiscogsRecord, quantity: number = 1) {
  try {
    // Ensure discogsId is a valid number 
    let discogsId: bigint;
    
    try {
      // Use BigInt to handle large integers safely
      discogsId = typeof item.id === 'string' ? BigInt(item.id) : BigInt(item.id);
      
      // Only basic validation now that we're using BigInt
      if (!discogsId) {
        throw new Error(`Invalid discogsId: ${item.id}`);
      }
    } catch (error) {
      throw new Error(`Failed to convert discogsId: ${item.id} - ${error.message}`);
    }
    
    if (!item.title) {
      throw new Error('Item title is required');
    }
    
    if (typeof item.price !== 'number' || isNaN(item.price)) {
      throw new Error(`Invalid price: ${item.price}`);
    }
    
    const quantity_available = item.quantity_available || 1;
    
    // Check if the item already exists in the cart
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId,
        discogsId,
      },
    });
    
    if (existingItem) {
      // Update quantity of existing item
      const newQuantity = Math.min(existingItem.quantity + quantity, quantity_available);
      
      return prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    }
    
    // Prepare images (ensure it's a valid Prisma JSON array)
    const images = Array.isArray(item.images) ? item.images : [];
    
    // Add new item to cart
    return prisma.cartItem.create({
      data: {
        cartId,
        discogsId,
        title: item.title,
        price: item.price,
        quantity: Math.min(quantity, quantity_available),
        quantity_available,
        condition: item.condition || 'VG+',
        weight: item.weight || 180,
        images,
      },
    });
  } catch (error) {
    console.error(`Error adding item to cart:`, error);
    throw error;
  }
}

// Update cart item quantity
export async function updateCartItemQuantity(cartId: string, discogsId: number | bigint, quantity: number) {
  // Convert to BigInt for consistent handling
  const discogsBigInt = typeof discogsId === 'number' ? BigInt(discogsId) : discogsId;
  
  const item = await prisma.cartItem.findFirst({
    where: {
      cartId,
      discogsId: discogsBigInt,
    },
  });

  if (!item) {
    throw new Error(`Item with Discogs ID ${discogsId} not found in cart`);
  }

  return prisma.cartItem.update({
    where: { id: item.id },
    data: { 
      quantity: Math.min(quantity, item.quantity_available)
    },
  });
}

// Remove item from cart
export async function removeFromCart(cartId: string, discogsId: number | bigint) {
  // Convert to BigInt for consistent handling
  const discogsBigInt = typeof discogsId === 'number' ? BigInt(discogsId) : discogsId;
  
  const item = await prisma.cartItem.findFirst({
    where: {
      cartId,
      discogsId: discogsBigInt,
    },
  });

  if (!item) {
    throw new Error(`Item with Discogs ID ${discogsId} not found in cart`);
  }

  return prisma.cartItem.delete({
    where: { id: item.id },
  });
}

// Clear all items from cart
export async function clearCart(cartId: string) {
  return prisma.cartItem.deleteMany({
    where: { cartId },
  });
}

// Get cart with all items
export async function getCartWithItems(cartId: string) {
  return prisma.cart.findUnique({
    where: { id: cartId },
    include: { items: true },
  });
}

// Merge guest cart into user cart when a guest logs in
export async function mergeGuestCartToUserCart(guestId: string, userId: string) {
  // Find the guest cart
  const guestCart = await prisma.cart.findUnique({
    where: { guestId },
    include: { items: true },
  });

  if (!guestCart || guestCart.items.length === 0) {
    return null; // No guest cart or empty cart, nothing to merge
  }

  // Find or create the user's cart
  let userCart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: true },
  });

  if (!userCart) {
    userCart = await prisma.cart.create({
      data: { userId },
      include: { items: true },
    });
  }

  // Merge the items
  for (const guestItem of guestCart.items) {
    // Compare as strings to ensure correct matching with BigInt values
    const existingItem = userCart.items.find(
      (item) => item.discogsId.toString() === guestItem.discogsId.toString()
    );

    if (existingItem) {
      // Update quantity of existing item
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: Math.min(
            existingItem.quantity + guestItem.quantity,
            guestItem.quantity_available
          ),
        },
      });
    } else {
      // Add guest's item to user's cart
      await prisma.cartItem.create({
        data: {
          cartId: userCart.id,
          discogsId: guestItem.discogsId,
          title: guestItem.title,
          price: guestItem.price,
          quantity: guestItem.quantity,
          quantity_available: guestItem.quantity_available,
          condition: guestItem.condition,
          weight: guestItem.weight,
          images: guestItem.images,
        },
      });
    }
  }

  // Delete the guest cart after merging
  await prisma.cart.delete({
    where: { id: guestCart.id },
  });

  // Return the updated user cart
  return prisma.cart.findUnique({
    where: { userId },
    include: { items: true },
  });
}