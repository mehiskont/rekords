"use client"

import React, { createContext, useContext, useReducer, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import type { Record } from "@/types/record"

interface CartItem extends Record {
  quantity: number
  stockQuantity: number
  weight: number
}

interface DbCartItem {
  discogsId: number | string;
  title: string;
  price: number;
  quantity: number;
  weight?: number;
  condition?: string;
  images?: any[];
}

interface CartState {
  items: CartItem[]
  isOpen: boolean
  isLoading: boolean
}

type CartAction =
  | { type: "ADD_ITEM"; payload: Record }
  | { type: "REMOVE_ITEM"; payload: number | string }
  | { type: "UPDATE_QUANTITY"; payload: { id: number | string; quantity: number } }
  | { type: "TOGGLE_CART" }
  | { type: "CLEAR_CART" }
  | { type: "CLEAR_UI_CART" }
  | { type: "LOAD_CART"; payload: CartItem[] }
  | { type: "SET_LOADING"; payload: boolean }

const CartContext = createContext<{
  state: CartState
  dispatch: React.Dispatch<CartAction>
} | null>(null)

const initialState: CartState = {
  items: [],
  isOpen: false,
  isLoading: true
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const payloadDiscogsId = action.payload.discogsReleaseId;
      
      if (payloadDiscogsId === undefined || payloadDiscogsId === null) {
        console.error("ADD_ITEM failed: discogsReleaseId is missing in payload", action.payload);
        return state;
      }
      
      const existingItem = state.items.find((item) => String(item.id) === String(payloadDiscogsId));
      const availableStock = action.payload.quantity || 0;

      if (existingItem) {
        const updatedItems = state.items.map((item) => {
          if (String(item.id) === String(payloadDiscogsId)) {
            const newQuantity = Math.min(item.quantity + 1, availableStock);
            return {
              ...item,
              quantity: newQuantity,
              stockQuantity: availableStock,
              weight: action.payload.weight || 180,
            };
          } else {
            return item;
          }
        });
        return { ...state, items: updatedItems };
      }
      
      return {
        ...state,
        items: [...state.items, { 
          ...action.payload, 
          id: payloadDiscogsId,
          quantity: 1,
          stockQuantity: availableStock,
          weight: action.payload.weight || 180
        }],
      }
    }
    case "REMOVE_ITEM":
      const idToRemove = String(action.payload);
      return {
        ...state,
        items: state.items.filter((item) => String(item.id) !== idToRemove),
      }
    case "UPDATE_QUANTITY":
      const idToUpdate = String(action.payload.id);
      return {
        ...state,
        items: state.items.map((item) => {
          if (String(item.id) === idToUpdate) {
            const newQuantity = Math.max(1, Math.min(action.payload.quantity, item.stockQuantity || 0));
            return { ...item, quantity: newQuantity };
          } else {
            return item;
          }
        }),
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
    case "CLEAR_UI_CART":
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

// Simple utility functions outside the component
function saveToLocalStorage(key: string, data: any) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

function getFromLocalStorage(key: string) {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to get from localStorage:', error);
    return null;
  }
}

// Save auth cart for later
function saveAuthCartForLater(items: CartItem[]) {
  if (items.length === 0) return;
  
  saveToLocalStorage('plastik-auth-cart-backup', {
    items,
    timestamp: Date.now()
  });
  console.log(`Saved ${items.length} authenticated cart items for future login`);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { status } = useSession();
  const prevStatusRef = useRef(status);
  const initialLoadDoneRef = useRef(false);
  
  // Simple cart fetch function
  async function fetchCart() {
    if (typeof window === 'undefined') return;
    
    dispatch({ type: "SET_LOADING", payload: true });
    
    try {
      if (status === 'authenticated') {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const response = await fetch(`${apiBaseUrl}/api/cart`, {
          credentials: 'include'
        });
        
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        
        const responseText = await response.text();
        if (!responseText) {
          dispatch({ type: "LOAD_CART", payload: [] });
          return;
        }
        
        try {
          const cartData = JSON.parse(responseText);
          const dbCartItems = cartData.items && Array.isArray(cartData.items) ? cartData.items : [];
          
          if (dbCartItems.length > 0) {
            const formattedItems = dbCartItems.map((item: DbCartItem): CartItem => {
              let cover_image = item.images?.[0]?.uri || item.images?.[0]?.resource_url || "/placeholder.svg";
              return {
                id: String(item.discogsId),
                title: item.title,
                price: item.price,
                quantity: item.quantity,
                stockQuantity: item.quantity,
                weight: item.weight || 180,
                condition: item.condition,
                status: 'FOR_SALE',
                coverImage: cover_image,
                discogsReleaseId: String(item.discogsId),
                artist: undefined,
                label: undefined,
                catalogNumber: undefined,
                format: undefined,
              };
            });
            dispatch({ type: "LOAD_CART", payload: formattedItems });
          } else {
            dispatch({ type: "LOAD_CART", payload: [] });
          }
        } catch (parseError) {
          console.error('Failed to parse cart response:', parseError);
          dispatch({ type: "LOAD_CART", payload: [] });
        }
      } else {
        // Guest user - load from localStorage
        const localCart = getFromLocalStorage('plastik-cart');
        if (localCart?.items && Array.isArray(localCart.items)) {
          dispatch({ type: "LOAD_CART", payload: localCart.items });
        } else {
          dispatch({ type: "LOAD_CART", payload: [] });
        }
      }
    } catch (error) {
      console.error("Error loading cart:", error);
      // Fallback to localStorage
      const localCart = getFromLocalStorage('plastik-cart');
      if (localCart?.items && Array.isArray(localCart.items)) {
        dispatch({ type: "LOAD_CART", payload: localCart.items });
      }
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }

  // Sync cart changes to API or localStorage
  async function syncCartAction(action: CartAction) {
    // Skip syncing for non-data-changing actions
    if (action.type === 'SET_LOADING' || action.type === 'LOAD_CART' || action.type === 'CLEAR_UI_CART') {
      return;
    }
    
    try {
      if (status === 'authenticated') {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || '';
        let endpoint = `${apiBaseUrl}/api/cart`;
        let method = 'POST';
        let body = null;
        
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
            endpoint = `${apiBaseUrl}/api/cart?discogsId=${Number(action.payload)}`;
            break;
          case 'CLEAR_CART':
            method = 'DELETE';
            endpoint = `${apiBaseUrl}/api/cart?clearAll=true`;
            break;
          case 'TOGGLE_CART':
            // Just save UI state
            saveToLocalStorage('plastik-cart-ui-state', {
              isOpen: !state.isOpen,
              timestamp: Date.now()
            });
            return;
          default:
            return;
        }
        
        const response = await fetch(endpoint, {
          method,
          headers: body ? { 'Content-Type': 'application/json' } : undefined,
          body: body ? JSON.stringify(body) : undefined,
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        // Re-fetch cart after API change
        await fetchCart();
      }
    } catch (error) {
      console.error(`Error syncing cart action:`, error);
    }
  }

  // Initial load
  useEffect(() => {
    if (!initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true;
      fetchCart();
    }
  }, []);

  // Authentication change handler
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = status;
    
    // Skip the first render
    if (!initialLoadDoneRef.current) return;
    
    // Login: check for pending cart items
    if (prevStatus === 'unauthenticated' && status === 'authenticated') {
      console.log('User logged in, checking for cart items to restore');
      
      // Let our CartMergeHandler component handle the merging
      // Just mark that we need to merge with a timestamp
      if (typeof window !== 'undefined') {
        localStorage.setItem('plastik-cart-login-time', Date.now().toString());
      }
      
      // Load the user's cart from the server
      fetchCart();
    } 
    // Logout: save current items for later
    else if (prevStatus === 'authenticated' && status === 'unauthenticated') {
      console.log('User logged out, saving cart items');
      
      // Save current items for future login
      saveAuthCartForLater(state.items);
      
      // Load/initialize guest cart
      fetchCart();
    }
  }, [status]);

  // Save to localStorage when cart changes for guest users
  useEffect(() => {
    if (typeof window === 'undefined' || state.isLoading) return;
    
    if (status === 'unauthenticated') {
      // For guest users, save full cart
      saveToLocalStorage('plastik-cart', {
        items: state.items,
        isOpen: state.isOpen,
        timestamp: Date.now()
      });
    } else if (status === 'authenticated') {
      // For logged in users, just save UI state
      saveToLocalStorage('plastik-cart-ui-state', {
        isOpen: state.isOpen,
        timestamp: Date.now()
      });
    }
  }, [state.items, state.isOpen, status, state.isLoading]);

  // Create dispatch function that syncs with API/localStorage
  function dispatchWithSync(action: CartAction) {
    // Update local state immediately
    dispatch(action);
    
    // Don't sync during loading except for UI toggle
    if (state.isLoading && action.type !== 'TOGGLE_CART') {
      return;
    }
    
    // Then sync with API/localStorage
    syncCartAction(action);
  }

  return (
    <CartContext.Provider value={{ state, dispatch: dispatchWithSync }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    console.warn("useCart: Context not found. Using fallback values.");
    return {
      state: { items: [], isOpen: false, isLoading: false },
      dispatch: () => console.warn("Cart dispatcher called outside of CartProvider context")
    };
  }
  return context;
}

export type { CartState, CartAction }