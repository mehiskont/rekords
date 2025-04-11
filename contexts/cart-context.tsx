"use client"

import React, { createContext, useContext, useReducer, useEffect, useState, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import type { Record } from "@/types/record"

interface CartItem extends Record {
  quantity: number
  stockQuantity: number
  weight: number
}

// Define a type for the structure received from the DB /api/cart
interface DbCartItem {
  discogsId: number | string;
  title: string;
  price: number;
  quantity: number;
  weight?: number;
  condition?: string;
  images?: any[]; // Or a more specific image type if known
  // Add other fields expected from the DB if necessary
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
  | { type: "CLEAR_UI_CART" } // Only clears UI, doesn't sync to server
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
      const payloadDiscogsId = action.payload.discogsReleaseId;
      
      // Ensure we have a Discogs ID before proceeding
      if (payloadDiscogsId === undefined || payloadDiscogsId === null) {
        console.error("ADD_ITEM failed: discogsReleaseId is missing in payload", action.payload);
        return state; // Cannot add item without a valid ID
      }
      
      const existingItem = state.items.find((item) => String(item.id) === String(payloadDiscogsId));
      const availableStock = action.payload.quantity || 0;

      if (existingItem) {
        const updatedItems = state.items.map((item) => {
          if (String(item.id) === String(payloadDiscogsId)) {
            const newQuantity = Math.min(item.quantity + 1, availableStock);
            console.log(`Updating item DiscogsID=${payloadDiscogsId}. Current: ${item.quantity}, Available: ${availableStock}, New: ${newQuantity}`);
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
      
      console.log(`Adding new cart item DiscogsID=${payloadDiscogsId}, weight: ${action.payload.weight || 180}g`);
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
            console.log(`Updating quantity via UPDATE_QUANTITY for DiscogsID=${item.id}. Requested: ${action.payload.quantity}, Stock: ${item.stockQuantity}, New: ${newQuantity}`);
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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)
  const { data: session, status } = useSession()
  
  // Create a ref to store the latest dispatch function
  const dispatchRef = useRef(dispatch);
  
  // Create a ref to track previous session status
  const sessionRef = useRef(status);
  
  // Create a ref to store guest cart during login transition
  const guestCartRef = useRef<CartItem[]>([]);
  
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
  
  // **** Define fetchCart *before* the effect that uses it ****
  const fetchCart = useCallback(async () => {
    // Only run on client-side and if not already loading
    if (typeof window === 'undefined' || state.isLoading) return;

    dispatch({ type: "SET_LOADING", payload: true });
    console.log('Fetching cart data...');

    try {
      if (status === 'authenticated') {
        // Fetch cart for authenticated user
        const fetchUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/cart`;
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const cartData = await response.json();
        const dbCartItems = cartData.items && Array.isArray(cartData.items) ? cartData.items : [];
        console.log(`Received ${dbCartItems.length} items from database cart`);
        dispatch({ type: "CLEAR_UI_CART" }); // Clear UI first
        if (dbCartItems.length > 0) {
          const formattedItems: CartItem[] = dbCartItems.map((item: DbCartItem): CartItem => {
            let cover_image = item.images?.[0]?.uri || item.images?.[0]?.resource_url || "/placeholder.svg"; // Simplified image extraction
            return {
              id: String(item.discogsId), // Ensure ID is string
              title: item.title,
              price: item.price,
              quantity: item.quantity,
              stockQuantity: item.quantity, // Assuming DB quantity is max stock
              weight: item.weight || 180,
              condition: item.condition,
              status: 'FOR_SALE',
              coverImage: cover_image,
              discogsReleaseId: String(item.discogsId), // Ensure this is added and is a string
              artist: undefined,
              label: undefined,
              catalogNumber: undefined,
              format: undefined,
            };
          });
          console.log(`Loading ${formattedItems.length} items from database to UI`);
          dispatch({ type: "LOAD_CART", payload: formattedItems });
        } else {
          console.log('No items in database cart');
          dispatch({ type: "LOAD_CART", payload: [] });
        }
      } else if (status === 'unauthenticated') {
        // Load cart from localStorage for unauthenticated user
        console.log('Loading cart for unauthenticated user from localStorage');
        const localCart = getFromLocalStorage('plastik-cart');
        if (localCart?.items && Array.isArray(localCart.items)) {
          console.log(`Found ${localCart.items.length} items in localStorage cart`);
          dispatch({ type: "LOAD_CART", payload: localCart.items });
        } else {
          console.log('No items in localStorage cart');
          dispatch({ type: "LOAD_CART", payload: [] });
        }
      }
    } catch (error) {
      console.error("Error loading cart:", error);
      // Fallback logic remains the same
      try {
        const localCart = getFromLocalStorage('plastik-cart');
        if (localCart?.items) dispatch({ type: "LOAD_CART", payload: localCart.items });
      } catch (fallbackError) {
        console.error('Fallback cart loading also failed:', fallbackError);
      }
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [status, getFromLocalStorage]);

  // Update the dispatch ref whenever dispatch changes
  useEffect(() => {
    dispatchRef.current = dispatch;
  }, [dispatch]);
  
  // Effect for handling authentication transition and merge
  useEffect(() => {
    const previousStatus = sessionRef.current;
    sessionRef.current = status;
    console.log(`Session status changed from ${previousStatus} to ${status}`);

    // If we're going from unauthenticated to authenticated, handle merge BEFORE fetching
    if (previousStatus === 'unauthenticated' && status === 'authenticated') {
      console.log('Authentication transition detected - attempting guest cart merge...');
      
      const attemptMerge = async () => {
        let guestItemsToMerge: CartItem[] = [];
        let foundSource: string | null = null;

        // 1. Check sessionStorage
        if (typeof window !== 'undefined' && window.sessionStorage) {
          try {
            const sessionItems = window.sessionStorage.getItem('plastik-guest-cart-for-merge');
            if (sessionItems) {
              const parsedItems = JSON.parse(sessionItems);
              if (Array.isArray(parsedItems) && parsedItems.length > 0) {
                guestItemsToMerge = parsedItems;
                foundSource = 'sessionStorage';
              }
            }
          } catch (e) { console.error('Error reading sessionStorage for merge:', e); }
        }

        // 2. Check localStorage backup if nothing in sessionStorage
        if (!foundSource) {
          const guestCartBackup = getFromLocalStorage('plastik-guest-cart-backup');
          if (guestCartBackup?.items && Array.isArray(guestCartBackup.items) && 
              guestCartBackup.items.length > 0 && guestCartBackup.needsMerge === true) {
            guestItemsToMerge = guestCartBackup.items;
            foundSource = 'localStorageBackup';
          }
        }
        
        // 3. Check current localStorage cart if still nothing
        // This is less likely needed if the preservation logic works, but acts as a fallback
        if (!foundSource) {
           const localCart = getFromLocalStorage('plastik-cart');
           if (localCart?.items && Array.isArray(localCart.items) && localCart.items.length > 0) {
              guestItemsToMerge = localCart.items;
              foundSource = 'localStorageCurrent';
           }
        }

        if (guestItemsToMerge.length > 0) {
          console.log(`Found ${guestItemsToMerge.length} guest items in ${foundSource} to merge.`);
          try {
            // Call the merge API endpoint (assuming PATCH /api/cart)
            const mergeResponse = await fetch('/api/cart', {
              method: 'PATCH', // Use PATCH for merging
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items: guestItemsToMerge })
            });

            if (!mergeResponse.ok) {
              throw new Error(`Failed to merge carts: ${mergeResponse.status}`);
            }
            console.log('Successfully called merge API endpoint.');

            // Clear storage AFTER successful merge call
            if (typeof window !== 'undefined') {
              if (window.sessionStorage) window.sessionStorage.removeItem('plastik-guest-cart-for-merge');
              saveToLocalStorage('plastik-guest-cart-backup', { items: [], timestamp: Date.now(), needsMerge: false });
              // Also clear the main local storage cart to avoid stale data
              saveToLocalStorage('plastik-cart', { items: [], isOpen: state.isOpen, isLoading: true, timestamp: Date.now() }); 
            }
            guestCartRef.current = []; // Clear memory ref
            console.log('Cleared guest cart storage after merge call.');

          } catch (mergeError) {
            console.error('Failed to merge carts:', mergeError);
            // Decide if we should still clear storage even if merge API failed? Maybe not.
          }
        } else {
          console.log('No guest cart items found needing merge.');
        }

        // **After merge attempt (success or fail), fetch the definitive cart state**
        console.log('Proceeding to fetch final cart state after merge attempt...');
        await fetchCart(); // Fetch cart AFTER merge attempt
      };

      attemptMerge(); // Run the async merge logic
    } else if (status !== 'loading') {
      // For other status changes (e.g., initial load, logout), just fetch the cart
      fetchCart();
    }
  // Ensure correct dependencies
  }, [status, fetchCart, getFromLocalStorage, saveToLocalStorage, state.isOpen]); 

  // Initialize cart from localStorage on first render (GUEST ONLY or initial load)
  useEffect(() => {
    // Only run on initial mount for guest or loading states
    if (typeof window !== 'undefined' && (status === 'unauthenticated' || status === 'loading')) {
      dispatch({ type: "SET_LOADING", payload: true });
      try {
        const localCart = getFromLocalStorage('plastik-cart');
        if (localCart && localCart.items && Array.isArray(localCart.items) && localCart.items.length > 0) {
          console.log('Initial load: Found cart in localStorage with', localCart.items.length, 'items for guest/loading user');
          dispatch({ type: "LOAD_CART", payload: localCart.items });
          
          // Preserve potentially mergeable items
          guestCartRef.current = localCart.items;
          saveToLocalStorage('plastik-guest-cart-backup', {
            items: localCart.items,
            timestamp: Date.now(),
            needsMerge: true // Assume it might need merge if user logs in later
          });
          
        } else {
          console.log('Initial load: No cart found in localStorage');
        }
      } catch (error) {
        console.error('Initial load: Error loading cart from localStorage', error);
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    }
  // Run only once on mount or if getFromLocalStorage changes (unlikely)
  }, [getFromLocalStorage, saveToLocalStorage, status]); 

  // Save cart to localStorage whenever it changes for unauthenticated users
  useEffect(() => {
    if (typeof window === 'undefined' || state.isLoading) return;
    
    if (status === 'unauthenticated') {
      // For guest users, save the full cart state to localStorage
      console.log(`Saving ${state.items.length} items to localStorage for guest user`);
      saveToLocalStorage('plastik-cart', {
        ...state,
        timestamp: Date.now()
      });
    } else if (status === 'authenticated') {
      // For authenticated users, we only save the UI state (open/closed)
      // The items are stored in the database
      console.log('Saving UI state to localStorage for authenticated user');
      saveToLocalStorage('plastik-cart-ui-state', {
        isOpen: state.isOpen,
        timestamp: Date.now()
      });
    }
  }, [state.items, state.isOpen, state.isLoading, status, saveToLocalStorage]);

  // Handle syncing cart changes to the API or localStorage
  const syncCartAction = useCallback(async (action: CartAction) => {
    // Skip syncing for non-data-changing actions
    if (action.type === 'SET_LOADING' || 
        action.type === 'LOAD_CART' || 
        action.type === 'TOGGLE_CART' ||
        action.type === 'CLEAR_UI_CART') {
      
      // For TOGGLE_CART, we still want to save the UI state to localStorage
      if (action.type === 'TOGGLE_CART' && status === 'authenticated') {
        const newState = cartReducer(state, action);
        saveToLocalStorage('plastik-cart-ui-state', {
          isOpen: newState.isOpen,
          timestamp: Date.now()
        });
      }
      return;
    }
    
    try {
      if (status === 'authenticated') {
        // API call logic remains the same
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
        
        console.log(`Syncing action ${action.type} to database for authenticated user`);
        const response = await fetch(endpoint, {
          method,
          headers: body ? { 'Content-Type': 'application/json' } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        // **** Re-fetch cart after successful API call ****
        console.log(`Action ${action.type} synced successfully, re-fetching cart...`);
        await fetchCart(); // Call fetchCart here

      } else {
        console.log(`Not syncing action ${action.type} to database - user not authenticated`);
        // For unauthenticated users, the localStorage useEffect handles saving
      }
    } catch (error) {
      console.error(`Error syncing cart action ${action.type}:`, error);
      // Optionally trigger a fetchCart even on error to try and reconcile?
      // await fetchCart(); 
    }
  }, [status, saveToLocalStorage, fetchCart]);
  
  // Create a wrapped version of dispatch that syncs with the API or localStorage
  const syncedDispatch = useCallback((action: CartAction) => {
    // First update the local state immediately for responsive UI
    dispatch(action);
    
    // Then sync with server or localStorage as appropriate
    // Always sync TOGGLE_CART for UI state persistence
    if (!state.isLoading || action.type === 'CLEAR_CART' || action.type === 'TOGGLE_CART') {
      syncCartAction(action);
    }
  }, [state.isLoading, syncCartAction, dispatch]);

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