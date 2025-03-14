"use client"

import type React from "react"
import { createContext, useContext, useReducer } from "react"
import type { DiscogsRecord } from "@/types/discogs"

interface CartItem extends DiscogsRecord {
  quantity: number
  weight: number // Add this line if it's not already present
}

interface CartState {
  items: CartItem[]
  isOpen: boolean
}

type CartAction =
  | { type: "ADD_ITEM"; payload: DiscogsRecord }
  | { type: "REMOVE_ITEM"; payload: number }
  | { type: "UPDATE_QUANTITY"; payload: { id: number; quantity: number } }
  | { type: "TOGGLE_CART" }
  | { type: "CLEAR_CART" }

const CartContext = createContext<{
  state: CartState
  dispatch: React.Dispatch<CartAction>
} | null>(null)

const initialState: CartState = {
  items: [],
  isOpen: false,
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existingItem = state.items.find((item) => item.id === action.payload.id)

      if (existingItem) {
        const updatedItems = state.items.map((item) =>
            item.id === action.payload.id
              ? {
                  ...item,
                  quantity: Math.min(item.quantity + 1, item.quantity_available),
                  weight: action.payload.weight || 180, // Ensure weight is set, default to 180g
                }
              : item
        );
        
        // Log for debugging weight issues
        console.log(`Updated cart item: ID=${action.payload.id}, weight: ${action.payload.weight || 180}g`);
        
        return {
          ...state,
          items: updatedItems,
        }
      }
      
      // Log for debugging weight issues
      console.log(`Added new cart item: ID=${action.payload.id}, weight: ${action.payload.weight || 180}g`);

      return {
        ...state,
        items: [...state.items, { 
          ...action.payload, 
          quantity: 1, 
          weight: action.payload.weight || 180  // Ensure weight is set, default to 180g
        }],
      }
    }
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
      }
    case "UPDATE_QUANTITY":
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, quantity: Math.min(action.payload.quantity, item.quantity_available) }
            : item,
        ),
      }
    case "TOGGLE_CART":
      return {
        ...state,
        isOpen: !state.isOpen,
      }
    case "CLEAR_CART":
      return {
        ...state,
        items: [],
      }
    default:
      return state
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)

  return <CartContext.Provider value={{ state, dispatch }}>{children}</CartContext.Provider>
}

export function useCart() {
  try {
    const context = useContext(CartContext)
    if (!context) {
      // Return a dummy context if the real one isn't available
      // This allows components to work even if CartProvider isn't available
      console.warn("useCart: Context not found. Using fallback values.");
      return {
        state: { items: [], isOpen: false },
        dispatch: () => console.warn("Cart dispatcher called outside of CartProvider context")
      };
    }
    return context
  } catch (error) {
    console.error("Error in useCart hook:", error);
    // Return a dummy context in case of errors
    return {
      state: { items: [], isOpen: false },
      dispatch: () => console.warn("Cart dispatcher called with error")
    };
  }
}

export type { CartState, CartAction }

