"use client"

import React, { createContext, useContext, useReducer, useEffect, useState, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import type { DiscogsRecord } from "@/types/discogs"

interface CartItem extends DiscogsRecord {
  quantity: number
  weight: number
}

interface CartState {
  items: CartItem[]
  isOpen: boolean
  isLoading: boolean
}

type CartAction =
  | { type: "ADD_ITEM"; payload: DiscogsRecord }
  | { type: "REMOVE_ITEM"; payload: number }
  | { type: "UPDATE_QUANTITY"; payload: { id: number; quantity: number } }
  | { type: "TOGGLE_CART" }
  | { type: "CLEAR_CART" }
  | { type: "LOAD_CART"; payload: CartItem[] }
  | { type: "SET_LOADING"; payload: boolean }

const CartContext = createContext<{
  state: CartState
  dispatch: React.Dispatch<CartAction>
} | null>(null)

// Initial state with empty cart
const initialState: CartState = {
  items: [],
  isOpen: false,
  isLoading: true
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      // Ensure ID is a number for consistent comparison
      const payloadId = Number(action.payload.id);
      const existingItem = state.items.find((item) => Number(item.id) === payloadId);

      if (existingItem) {
        const updatedItems = state.items.map((item) =>
            Number(item.id) === payloadId
              ? {
                  ...item,
                  quantity: Math.min(item.quantity + 1, item.quantity_available),
                  weight: action.payload.weight || 180, // Ensure weight is set, default to 180g
                }
              : item
        );
        
        console.log(`Updated cart item: ID=${payloadId}, weight: ${action.payload.weight || 180}g`);
        
        return {
          ...state,
          items: updatedItems,
        }
      }
      
      console.log(`Added new cart item: ID=${payloadId}, weight: ${action.payload.weight || 180}g`);

      return {
        ...state,
        items: [...state.items, { 
          ...action.payload, 
          id: payloadId, // Make sure ID is a number in the state
          quantity: 1, 
          weight: action.payload.weight || 180
        }],
      }
    }
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((item) => Number(item.id) !== Number(action.payload)),
      }
    case "UPDATE_QUANTITY":
      return {
        ...state,
        items: state.items.map((item) =>
          Number(item.id) === Number(action.payload.id)
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
    case "LOAD_CART":
      return {
        ...state,
        items: action.payload,
      }
    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      }
    default:
      return state;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)
  const { data: session, status } = useSession()
  
  // Create a ref to store the latest dispatch function
  const dispatchRef = useRef(dispatch);
  
  // Update the ref whenever dispatch changes
  useEffect(() => {
    dispatchRef.current = dispatch;
  }, [dispatch]);
  
  // Helper function to safely interact with localStorage (client-side only)
  const saveToLocalStorage = useCallback((key: string, data: any) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(data));
        console.log(`Saved to localStorage (${key}):`, 
          data.items ? `${data.items.length} items` : 'No items');
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
      }
    }
  }, []);

  const getFromLocalStorage = useCallback((key: string) => {
    if (typeof window !== 'undefined') {
      try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        console.error('Failed to get from localStorage:', error);
        return null;
      }
    }
    return null;
  }, []);
  
  // Initialize cart from localStorage on first render (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('Initial cart load attempt from localStorage');
      dispatch({ type: "SET_LOADING", payload: true });
      
      try {
        const localCart = getFromLocalStorage('plastik-cart');
        if (localCart && localCart.items && Array.isArray(localCart.items)) {
          console.log('Found cart in localStorage with', localCart.items.length, 'items');
          dispatch({ type: "LOAD_CART", payload: localCart.items });
        } else {
          console.log('No cart found in localStorage');
        }
      } catch (error) {
        console.error('Error loading cart from localStorage', error);
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    }
  }, [getFromLocalStorage]);
  
  // Load cart from API when session changes
  useEffect(() => {
    async function fetchCart() {
      // Only attempt to fetch from API if authenticated
      if (status === 'authenticated' && session?.user) {
        console.log('Authenticated user, fetching cart from API');
        dispatch({ type: "SET_LOADING", payload: true });
        
        try {
          const response = await fetch('/api/cart');
          
          if (!response.ok) {
            throw new Error(`Failed to load cart: ${response.status}`);
          }
          
          const cartData = await response.json();
          
          // Transform the cart items to match the format expected by the UI
          if (cartData.items && Array.isArray(cartData.items) && cartData.items.length > 0) {
            console.log('Loaded', cartData.items.length, 'items from API');
            const formattedItems = cartData.items.map((item: any) => ({
              id: Number(item.discogsId), // Ensure discogsId is a number
              title: item.title,
              price: item.price,
              quantity: item.quantity,
              quantity_available: item.quantity_available || 1,
              weight: item.weight || 180,
              condition: item.condition,
              images: item.images || [],
            }));
            
            dispatch({ type: "LOAD_CART", payload: formattedItems });
          } else {
            console.log('API returned empty cart, keeping localStorage cart');
          }
        } catch (error) {
          console.error("Error loading cart from API:", error);
          // If API fails, we'll keep the localStorage cart as fallback
        } finally {
          dispatch({ type: "SET_LOADING", payload: false });
        }
      }
    }
    
    // Only run this effect when auth status changes from loading to authenticated
    if (status !== 'loading') {
      fetchCart();
    }
  }, [status, session, getFromLocalStorage]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    // Don't save while loading or if cart is empty on initial load
    if (!state.isLoading) {
      // Always save cart state, even if empty (to clear previous cart)
      saveToLocalStorage('plastik-cart', state);
    }
  }, [state, state.items, state.isLoading, saveToLocalStorage]);

  // Handle syncing cart changes to the API
  const syncCartAction = useCallback(async (action: CartAction) => {
    // Skip syncing for SET_LOADING and LOAD_CART actions
    if (action.type === 'SET_LOADING' || action.type === 'LOAD_CART' || action.type === 'TOGGLE_CART') {
      return;
    }
    
    try {
      // Always update localStorage regardless of API success
      const currentState = cartReducer(state, action);
      saveToLocalStorage('plastik-cart', currentState);
      
      // Only try to sync with API if user is authenticated
      if (status === 'authenticated') {
        let endpoint = '/api/cart';
        let method = 'POST';
        let body: any = null;
        
        switch (action.type) {
          case 'ADD_ITEM':
            method = 'POST';
            body = { item: action.payload, quantity: 1 };
            break;
          case 'UPDATE_QUANTITY':
            method = 'PUT';
            body = { 
              discogsId: Number(action.payload.id), 
              quantity: action.payload.quantity 
            };
            break;
          case 'REMOVE_ITEM':
            method = 'DELETE';
            endpoint = `/api/cart?discogsId=${Number(action.payload)}`;
            break;
          case 'CLEAR_CART':
            method = 'DELETE';
            endpoint = '/api/cart?clearAll=true';
            break;
          default:
            return;
        }
        
        const response = await fetch(endpoint, {
          method,
          headers: body ? { 'Content-Type': 'application/json' } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
      }
    } catch (error) {
      console.error(`Error syncing cart action ${action.type}:`, error);
      // Continue without failing - localStorage backup is still working
    }
  }, [state, status]);
  
  // Create a wrapped version of dispatch that syncs with the API
  const syncedDispatch = useCallback((action: CartAction) => {
    // First update the local state
    dispatchRef.current(action);
    
    // Then sync with localStorage and API 
    if (!state.isLoading || action.type === 'CLEAR_CART') {
      // Always sync to ensure we don't miss actions
      syncCartAction(action);
    }
  }, [state.isLoading, syncCartAction]);

  return <CartContext.Provider value={{ state, dispatch: syncedDispatch }}>{children}</CartContext.Provider>
}

export function useCart() {
  try {
    const context = useContext(CartContext)
    if (!context) {
      // Return a dummy context if the real one isn't available
      // This allows components to work even if CartProvider isn't available
      console.warn("useCart: Context not found. Using fallback values.");
      return {
        state: { items: [], isOpen: false, isLoading: false },
        dispatch: () => console.warn("Cart dispatcher called outside of CartProvider context")
      };
    }
    return context
  } catch (error) {
    console.error("Error in useCart hook:", error);
    // Return a dummy context in case of errors
    return {
      state: { items: [], isOpen: false, isLoading: false },
      dispatch: () => console.warn("Cart dispatcher called with error")
    };
  }
}

export type { CartState, CartAction }

