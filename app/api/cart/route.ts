import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { 
  getOrCreateCart, 
  addToCart, 
  removeFromCart, 
  updateCartItemQuantity, 
  clearCart,
  mergeGuestCartToUserCart
} from "@/lib/cart";

// GET /api/cart - Get the current user's cart
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    console.log(`GET /api/cart - User ID: ${userId || 'guest'}`);
    
    // If database fails, return a fallback empty cart structure
    try {
      const cart = await getOrCreateCart(userId);
      console.log(`Cart retrieved: ID=${cart.id}, Items=${cart.items?.length || 0}`);
      
      // Transform the cart object to handle BigInt serialization
      const serializedCart = {
        ...cart,
        items: cart.items?.map(item => ({
          ...item,
          discogsId: item.discogsId.toString(), // Convert BigInt to string for JSON serialization
        })) || []
      };
      
      return NextResponse.json(serializedCart);
    } catch (dbError) {
      console.error("Database error getting cart:", dbError);
      // Return a fallback empty cart structure
      return NextResponse.json({
        id: "fallback-cart",
        items: [],
        userId: userId || null,
        guestId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  } catch (error) {
    console.error("Error getting cart:", error);
    return NextResponse.json(
      { 
        id: "error-cart",
        items: [],
        error: "Failed to get cart" 
      }, 
      { status: 200 } // Return 200 with empty cart instead of 500
    );
  }
}

// POST /api/cart - Add item to cart
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    const cart = await getOrCreateCart(userId);
    const data = await request.json();
    
    // Handle localStorage cart sync when a user logs in - pass entire cart items for sync
    if (data.syncLocalCart && data.items && Array.isArray(data.items)) {
      console.log(`Syncing ${data.items.length} items from localStorage to database for userId: ${userId}`);
      
      try {
        // Clear current cart first
        await clearCart(cart.id);
        
        // Add all items from localStorage
        let itemsAdded = 0;
        for (const item of data.items) {
          try {
            // No need to validate range since we're using BigInt now
            await addToCart(cart.id, item, item.quantity || 1);
            itemsAdded++;
          } catch (itemError) {
            console.error(`Error adding item ${item.id || 'unknown'} to cart:`, itemError);
          }
        }
        
        console.log(`Successfully added ${itemsAdded} of ${data.items.length} items to database cart`);
        
        // Return the updated cart
        const updatedCart = await getOrCreateCart(userId);
        
        // Transform updated cart to handle BigInt serialization
        const serializedCart = {
          ...updatedCart,
          items: updatedCart.items?.map(item => ({
            ...item,
            discogsId: item.discogsId.toString(), // Convert BigInt to string
          })) || []
        };
        
        return NextResponse.json(serializedCart);
      } catch (syncError) {
        console.error("Error syncing cart items:", syncError);
        // Continue with a fallback empty cart
        return NextResponse.json({
          id: cart.id,
          items: [],
          userId: userId || null,
          guestId: null,
          createdAt: cart.createdAt,
          updatedAt: new Date()
        });
      }
    }
    
    // Regular item addition
    if (!data.item) {
      return NextResponse.json(
        { error: "Item data is required" },
        { status: 400 }
      );
    }
    
    const result = await addToCart(cart.id, data.item, data.quantity || 1);
    
    // Transform result to handle BigInt serialization
    const serializedResult = {
      ...result,
      discogsId: result.discogsId.toString(), // Convert BigInt to string
    };
    
    return NextResponse.json(serializedResult);
  } catch (error) {
    console.error("Error adding to cart:", error);
    return NextResponse.json(
      { error: "Failed to add item to cart" },
      { status: 500 }
    );
  }
}

// PUT /api/cart - Update cart item quantity
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    const cart = await getOrCreateCart(userId);
    const data = await request.json();
    
    if (!data.discogsId || data.quantity === undefined) {
      return NextResponse.json(
        { error: "discogsId and quantity are required" },
        { status: 400 }
      );
    }
    
    try {
      // Use BigInt to handle large discogs IDs
      const discogsId = BigInt(data.discogsId);
      
      const result = await updateCartItemQuantity(cart.id, discogsId, data.quantity);
      
      // Transform result to handle BigInt serialization
      const serializedResult = {
        ...result,
        discogsId: result.discogsId.toString(), // Convert BigInt to string
      };
      
      return NextResponse.json(serializedResult);
    } catch (e) {
      console.error(`Error processing discogsId ${data.discogsId}:`, e);
      return NextResponse.json(
        { error: `Invalid discogsId: ${e.message}` },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error updating cart:", error);
    return NextResponse.json(
      { error: "Failed to update cart" },
      { status: 500 }
    );
  }
}

// DELETE /api/cart - Remove item from cart or clear cart
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    const cart = await getOrCreateCart(userId);
    const { searchParams } = new URL(request.url);
    const discogsId = searchParams.get("discogsId");
    const clearAll = searchParams.get("clearAll");
    
    if (clearAll === "true") {
      await clearCart(cart.id);
      return NextResponse.json({ success: true });
    }
    
    if (!discogsId) {
      return NextResponse.json(
        { error: "discogsId parameter is required" },
        { status: 400 }
      );
    }
    
    try {
      // Parse using BigInt instead of parseInt to handle large numbers
      const id = BigInt(discogsId);
      await removeFromCart(cart.id, id);
    } catch (e) {
      console.error(`Error parsing or processing discogsId ${discogsId}:`, e);
      return NextResponse.json(
        { error: `Invalid discogsId format: ${e.message}` },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing from cart:", error);
    return NextResponse.json(
      { error: "Failed to remove item from cart" },
      { status: 500 }
    );
  }
}

// POST /api/cart/merge - Merge guest cart into user cart after login
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: "User must be logged in" },
        { status: 401 }
      );
    }
    
    const data = await request.json();
    
    if (!data.guestId) {
      return NextResponse.json(
        { error: "guestId is required" },
        { status: 400 }
      );
    }
    
    const mergedCart = await mergeGuestCartToUserCart(data.guestId, userId);
    
    // Transform merged cart to handle BigInt serialization
    const serializedCart = mergedCart ? {
      ...mergedCart,
      items: mergedCart.items?.map(item => ({
        ...item,
        discogsId: item.discogsId.toString(), // Convert BigInt to string
      })) || []
    } : null;
    
    return NextResponse.json(serializedCart);
  } catch (error) {
    console.error("Error merging carts:", error);
    return NextResponse.json(
      { error: "Failed to merge carts" },
      { status: 500 }
    );
  }
}