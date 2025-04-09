"use client"

import React, { createContext, useContext, useReducer, useEffect, useState, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import type { DiscogsRecord } from "@/types"

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
    case "CLEAR_UI_CART":
      // Just clear the UI state without syncing to server
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
  
  // Update the refs whenever values change
  useEffect(() => {
    dispatchRef.current = dispatch;
  }, [dispatch]);
  
  useEffect(() => {
    // Store the previous status before updating
    const previousStatus = sessionRef.current;
    sessionRef.current = status;
    
    console.log(`Session status changed from ${previousStatus} to ${status}`);
    
    // If we're going from unauthenticated to authenticated, 
    // save the guest cart for merging later
    if (previousStatus === 'unauthenticated' && status === 'authenticated') {
      console.log('Authentication transition detected - preserving guest cart');
      
      // Clear the merge flag when user logs in so we can merge guest cart items
      try {
        // Read current localStorage cart before doing anything else
        const localCart = getFromLocalStorage('plastik-cart');
        
        // The OAuth flow involves page navigation, so we need to be very careful about
        // saving guest cart items for merging. We'll write to sessionStorage as well
        // which persists during page navigation within the same tab.
        if (localCart?.items && Array.isArray(localCart.items) && localCart.items.length > 0) {
          console.log(`Preserving ${localCart.items.length} guest cart items for merge`);
          
          // Save to session storage for OAuth flows
          if (typeof window !== 'undefined' && window.sessionStorage) {
            window.sessionStorage.setItem('plastik-guest-cart-for-merge', 
              JSON.stringify(localCart.items));
          }
          
          // Keep in memory
          guestCartRef.current = localCart.items;
          
          // Save to localStorage as backup
          saveToLocalStorage('plastik-guest-cart-backup', {
            items: localCart.items,
            timestamp: Date.now(),
            needsMerge: true
          });
        }
      } catch (err) {
        console.error('Failed to preserve guest cart:', err);
      }
    }
  }, [status, getFromLocalStorage, saveToLocalStorage]);
  
  // Initialize cart from localStorage on first render (client-side only)
  // For unauthenticated users OR on initial load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      dispatch({ type: "SET_LOADING", payload: true });
      
      try {
        const localCart = getFromLocalStorage('plastik-cart');
        if (localCart && localCart.items && Array.isArray(localCart.items)) {
          console.log('Found cart in localStorage with', localCart.items.length, 'items');
          
          // Load the cart only for unauthenticated users
          // Or when the authentication status is still loading
          if (status === 'unauthenticated' || status === 'loading') {
            console.log('Loading localStorage cart for unauthenticated/loading user');
            dispatch({ type: "LOAD_CART", payload: localCart.items });
            
            // Save guest cart items for potential merge later
            // This is crucial to handle OAuth login flows
            if (localCart.items.length > 0) {
              console.log(`Preserving ${localCart.items.length} initial cart items for potential merge`);
              guestCartRef.current = localCart.items;
              
              // Copy to a special key for backup that persists across page reloads
              localStorage.removeItem('plastik-cart-merged-flag');
              saveToLocalStorage('plastik-guest-cart-backup', {
                items: localCart.items,
                timestamp: Date.now()
              });
            }
          } else {
            console.log('Skipping localStorage cart load for authenticated user');
          }
        } else {
          console.log('No cart found in localStorage');
        }
      } catch (error) {
        console.error('Error loading cart from localStorage', error);
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    }
  }, [getFromLocalStorage, status]);
  
  // Load cart from API when session changes
  useEffect(() => {
    async function fetchCart() {
      console.log('Session status changed to:', status);
      dispatch({ type: "SET_LOADING", payload: true });
      
      try {
        // If authenticated, try to get the cart from API and handle merge
        if (status === 'authenticated' && session?.user) {
          console.log('Authenticated user, fetching cart from API');
          
          // CRITICAL: We need to check ALL possible sources for guest cart items
          // that might need to be merged after OAuth flow which involves page navigation
          
          // 1. Check sessionStorage first (best for OAuth flows)
          let guestItemsToMerge = [];
          let foundGuestItems = false;
          
          if (typeof window !== 'undefined' && window.sessionStorage) {
            try {
              const sessionItems = window.sessionStorage.getItem('plastik-guest-cart-for-merge');
              if (sessionItems) {
                const parsedItems = JSON.parse(sessionItems);
                if (Array.isArray(parsedItems) && parsedItems.length > 0) {
                  guestItemsToMerge = parsedItems;
                  foundGuestItems = true;
                  console.log(`Found ${parsedItems.length} guest items in sessionStorage`);
                }
              }
            } catch (e) {
              console.error('Error reading from sessionStorage:', e);
            }
          }
          
          // 2. Check backup in localStorage if nothing in sessionStorage
          if (!foundGuestItems) {
            const guestCartBackup = getFromLocalStorage('plastik-guest-cart-backup');
            if (guestCartBackup?.items && Array.isArray(guestCartBackup.items) && 
                guestCartBackup.items.length > 0 && guestCartBackup.needsMerge === true) {
              guestItemsToMerge = guestCartBackup.items;
              foundGuestItems = true;
              console.log(`Found ${guestCartBackup.items.length} guest items in localStorage backup`);
            }
          }
          
          // 3. Check current localStorage cart
          if (!foundGuestItems) {
            const localCart = getFromLocalStorage('plastik-cart');
            if (localCart?.items && Array.isArray(localCart.items) && localCart.items.length > 0) {
              guestItemsToMerge = localCart.items;
              foundGuestItems = true;
              console.log(`Found ${localCart.items.length} guest items in current localStorage cart`);
            }
          }
          
          // 4. Check in-memory reference
          if (!foundGuestItems && guestCartRef.current && Array.isArray(guestCartRef.current) && 
              guestCartRef.current.length > 0) {
            guestItemsToMerge = guestCartRef.current;
            foundGuestItems = true;
            console.log(`Found ${guestCartRef.current.length} guest items in memory reference`);
          }
          
          // Attempt to merge guest items if found
          if (guestItemsToMerge.length > 0) {
            console.log(`Attempting to merge ${guestItemsToMerge.length} guest items into user cart`);
            
            try {
              // Call the merge API endpoint
              const mergeResponse = await fetch('/api/cart', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  items: guestItemsToMerge
                })
              });
              
              if (!mergeResponse.ok) {
                throw new Error(`Failed to merge carts: ${mergeResponse.status}`);
              }
              
              console.log('Successfully merged guest cart items into user cart');
              
              // Clean up all storage to prevent duplicate merges
              if (typeof window !== 'undefined') {
                // Clear sessionStorage
                if (window.sessionStorage) {
                  window.sessionStorage.removeItem('plastik-guest-cart-for-merge');
                }
                
                // Clear localStorage backup by marking as already merged
                saveToLocalStorage('plastik-guest-cart-backup', { 
                  items: [], 
                  timestamp: Date.now(),
                  needsMerge: false
                });
                
                // Clear current localStorage cart
                saveToLocalStorage('plastik-cart', {
                  items: [],
                  isOpen: state.isOpen,
                  isLoading: state.isLoading,
                  timestamp: Date.now()
                });
              }
              
              // Clear memory reference
              guestCartRef.current = [];
              
              console.log('Cleared all guest cart storage after successful merge');
            } catch (mergeError) {
              console.error('Failed to merge carts after login:', mergeError);
            }
          } else {
            console.log('No guest cart items found to merge');
          }
          
          // Now fetch user's cart from the database
          const response = await fetch('/api/cart');
          
          if (!response.ok) {
            throw new Error(`Failed to load cart: ${response.status}`);
          }
          
          const cartData = await response.json();
          console.log('API cart response:', cartData);
          const dbCartItems = cartData.items && Array.isArray(cartData.items) ? cartData.items : [];
          
          console.log(`Received ${dbCartItems.length} items from database cart`);
          
          // Log item details for debugging
          if (dbCartItems.length > 0) {
            dbCartItems.forEach((item, index) => {
              console.log(`DB Cart Item #${index + 1}: ID=${item.discogsId}, Title=${item.title}, Qty=${item.quantity}`);
            });
          }
          
          // Clear UI state first to prevent duplicates when loading from server
          dispatch({ type: "CLEAR_UI_CART" });
          
          // Format DB items for the UI
          if (dbCartItems.length > 0) {
            const formattedItems = dbCartItems.map((item: any) => {
              // Extract the first image URL for cover_image or use placeholder
              let cover_image = "/placeholder.svg";
              
              if (item.images && Array.isArray(item.images) && item.images.length > 0) {
                const firstImage = item.images[0];
                
                // Handle different possible image object structures
                if (typeof firstImage === 'string') {
                  cover_image = firstImage;
                } else if (typeof firstImage === 'object') {
                  // Try various properties that might contain the image URL
                  cover_image = firstImage.uri || firstImage.resource_url || 
                    firstImage.url || firstImage.image || firstImage.src || 
                    "/placeholder.svg";
                }
              }
                
              return {
                id: Number(item.discogsId),
                title: item.title,
                price: item.price,
                quantity: item.quantity,
                quantity_available: item.quantity_available || 1,
                weight: item.weight || 180,
                condition: item.condition,
                images: item.images || [],
                cover_image: cover_image,
              };
            });
            
            console.log(`Loading ${formattedItems.length} items from database to UI`);
            dispatch({ type: "LOAD_CART", payload: formattedItems });
          } else {
            console.log('No items in database cart');
            dispatch({ type: "LOAD_CART", payload: [] });
          }
        } else if (status === 'unauthenticated') {
          // For unauthenticated users, load cart from localStorage
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
        
        // If API fails, try to load from localStorage as fallback
        try {
          console.log('Loading cart from localStorage as fallback after error');
          const localCart = getFromLocalStorage('plastik-cart');
          if (localCart?.items && Array.isArray(localCart.items)) {
            dispatch({ type: "LOAD_CART", payload: localCart.items });
          }
        } catch (fallbackError) {
          console.error('Fallback cart loading also failed:', fallbackError);
        }
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    }
    
    // Run this effect whenever auth status changes or session changes
    // This covers login, logout, and initial page load
    fetchCart();
    
    // Create a cleanup function to prevent memory leaks
    return () => {
      console.log('Cart effect cleanup');
    };
  }, [status, session, getFromLocalStorage, saveToLocalStorage, state.isOpen]);

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
      // For authenticated users, sync directly with the API
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
        
        // Log status before API call
        console.log(`Syncing action ${action.type} to database for authenticated user`);
        
        const response = await fetch(endpoint, {
          method,
          headers: body ? { 'Content-Type': 'application/json' } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
      } else {
        console.log(`Not syncing action ${action.type} to database - user not authenticated`);
      }
    } catch (error) {
      console.error(`Error syncing cart action ${action.type}:`, error);
      // Continue without failing - localStorage backup is still working
    }
  }, [state, status, saveToLocalStorage]);
  
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