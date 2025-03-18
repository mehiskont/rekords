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
        // First remove any existing merge flag to ensure we'll attempt a merge
        localStorage.removeItem('plastik-cart-merged-flag');
        console.log('Cleared previous merge flag to allow new cart merge');
        
        const localCart = getFromLocalStorage('plastik-cart');
        if (localCart?.items && Array.isArray(localCart.items) && localCart.items.length > 0) {
          console.log(`Preserving ${localCart.items.length} guest cart items for merge`);
          guestCartRef.current = localCart.items;
          
          // Copy to a special key for backup
          saveToLocalStorage('plastik-guest-cart-backup', {
            items: localCart.items,
            timestamp: Date.now()
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
        // Check if we have items in localStorage first
        const localCart = getFromLocalStorage('plastik-cart');
        const localCartItems = localCart?.items && Array.isArray(localCart.items) ? localCart.items : [];
        console.log('Local cart has', localCartItems.length, 'items');
        
        // If authenticated, try to get the cart from API
        if (status === 'authenticated' && session?.user) {
          console.log('Authenticated user, fetching cart from API');
          
          // We need a reliable way to check if we've already merged carts
          // that works with OAuth flows that involve page navigation
          const hasAlreadyMerged = getFromLocalStorage('plastik-cart-merged-flag');
          
          if (hasAlreadyMerged) {
            console.log('Cart has already been merged according to flag, skipping merge operation');
          } else {
            // Always try to merge if we haven't merged yet since login
            console.log('No merge flag found - will check for items to merge');
            // Check multiple sources for guest cart items
            // 1. Current React reference (works within same session)
            const guestItems = guestCartRef.current;
            const hasPreservedGuestItems = guestItems && Array.isArray(guestItems) && guestItems.length > 0;
            
            // 2. Persistent backup in localStorage (works across page navigation/OAuth)
            const guestCartBackup = getFromLocalStorage('plastik-guest-cart-backup');
            const backupItems = guestCartBackup?.items || [];
            
            // 3. Current localStorage cart (fallback)
            const currentLocalItems = localCartItems || [];
            
            console.log(`Sources of guest items for merge:`);
            console.log(`1. React ref: ${hasPreservedGuestItems ? guestItems.length : 0} items`);
            console.log(`2. Backup: ${backupItems.length} items`);
            console.log(`3. Current localStorage: ${currentLocalItems.length} items`);
            
            // Get items to merge, prioritizing sources with items
            const itemsToMerge = hasPreservedGuestItems ? guestItems : 
                                (backupItems.length > 0 ? backupItems : 
                                (currentLocalItems.length > 0 ? currentLocalItems : []));
                                
            // If we have items to merge, attempt the merge
            if (itemsToMerge.length > 0) {
              console.log(`Attempting to merge ${itemsToMerge.length} guest items to user cart`);
              
              try {
                // Explicitly call the merge API endpoint
                const mergeResponse = await fetch('/api/cart', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    items: itemsToMerge
                  })
                });
                
                if (!mergeResponse.ok) {
                  throw new Error(`Failed to merge carts: ${mergeResponse.status}`);
                }
                
                console.log('Successfully merged carts after login');
                
                // We'll set the merged flag after we verify the merge was successful
                // But clear localStorage cart NOW to prevent remerging on refresh
                saveToLocalStorage('plastik-cart', {
                  items: [],
                  isOpen: state.isOpen,
                  isLoading: state.isLoading,
                  timestamp: Date.now()
                });
                
                // Don't set the merged flag yet
                // We'll do that after verifying the merge was successful
                console.log('Merge API call successful, cleared localStorage cart to prevent duplicate merges');
              } catch (mergeError) {
                console.error('Failed to merge carts after login:', mergeError);
              }
            }
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
          
          console.log('API cart has', dbCartItems.length, 'items');
          
          // Check if the server-side merge might have failed
          // If we had items to merge but the DB cart is empty, attempt a final fallback merge
          if (dbCartItems.length === 0 && itemsToMerge && itemsToMerge.length > 0) {
            console.log('WARNING: DB cart is empty after merge attempt. Server-side merge may have failed.');
            
            // Try one more emergency merge
            try {
              console.log('Attempting emergency fallback merge');
              const emergencyMergeResponse = await fetch('/api/cart', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  items: itemsToMerge
                })
              });
              
              if (emergencyMergeResponse.ok) {
                console.log('Emergency merge succeeded');
                // Reload cart data from server
                const refreshedResponse = await fetch('/api/cart');
                if (refreshedResponse.ok) {
                  const refreshedData = await refreshedResponse.json();
                  const refreshedItems = refreshedData.items && Array.isArray(refreshedData.items) 
                    ? refreshedData.items : [];
                  console.log(`Refreshed cart now has ${refreshedItems.length} items`);
                  
                  // Use the refreshed items
                  if (refreshedItems.length > 0) {
                    console.log('Using refreshed items from emergency merge');
                    Object.assign(dbCartItems, refreshedItems);
                  }
                }
              }
            } catch (emergencyError) {
              console.error('Emergency merge failed:', emergencyError);
            }
          }
          
          // Skip older merging logic since we've already explicitly merged if needed
          // Just load the DB cart directly
          
          // Format the items to match the UI format
          if (dbCartItems.length > 0) {
            console.log('Loading', dbCartItems.length, 'items from database');
            
            // Always clear the UI state before loading items from the database
            // to prevent duplicate items after page refresh
            dispatch({ type: "CLEAR_UI_CART" });
            
            // If we had items to merge and now DB has items, the merge was successful
            // Now it's safe to clear everything
            if (itemsToMerge && itemsToMerge.length > 0) {
              console.log('Merge verified successful, clearing local cart data');
              
              // Now clear all cart sources
              guestCartRef.current = [];
              
              // Clear cart data but preserve UI state
              saveToLocalStorage('plastik-cart', { 
                items: [], 
                isOpen: state.isOpen, 
                isLoading: false 
              });
              
              // Clear backup cart
              saveToLocalStorage('plastik-guest-cart-backup', { 
                items: [], 
                timestamp: Date.now() 
              });
              
              // Set merged flag to prevent future attempts on refresh
              // But only after we've verified the merge was successful
              saveToLocalStorage('plastik-cart-merged-flag', {
                merged: true,
                timestamp: Date.now(),
                mergeCount: dbCartItems.length
              });
              
              // Delete guest cart cookie
              document.cookie = "plastik_guest_cart_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
              
              console.log('Cleared all local cart data after successful merge verification');
            }
            
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
                
                console.log(`Loaded item ${item.title} - Found image: ${cover_image}`);
              } else {
                console.log(`Loaded item ${item.title} - No images found, using placeholder`);
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
                cover_image: cover_image, // Add the cover_image field
              };
            });
            
            dispatch({ type: "LOAD_CART", payload: formattedItems });
          } else if (localCartItems.length > 0) {
            // localStorage has items but DB doesn't - use PATCH endpoint to merge
            console.log('Syncing localStorage cart to empty database cart');
            
            // Make sure to clear UI state before loading new items
            dispatch({ type: "CLEAR_UI_CART" });
            
            const mergeResponse = await fetch('/api/cart', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                items: localCartItems
              })
            });
            
            if (!mergeResponse.ok) {
              throw new Error('Failed to merge localStorage cart to database');
            }
            
            // Get the merged cart items
            const mergedCart = await mergeResponse.json();
            if (mergedCart?.items && Array.isArray(mergedCart.items)) {
              console.log('Loaded merged cart with', mergedCart.items.length, 'items');
              
              // Format items for UI
              const formattedItems = mergedCart.items.map((item: any) => {
                // Extract image
                let cover_image = "/placeholder.svg";
                
                if (item.images && Array.isArray(item.images) && item.images.length > 0) {
                  const firstImage = item.images[0];
                  
                  // Handle different possible image object structures
                  if (typeof firstImage === 'string') {
                    cover_image = firstImage;
                  } else if (typeof firstImage === 'object') {
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
                  cover_image: cover_image
                };
              });
              
              // Load merged cart into UI
              dispatch({ type: "LOAD_CART", payload: formattedItems });
              
              // Clear localStorage
              saveToLocalStorage('plastik-cart', { items: [], isOpen: false, isLoading: false });
            }
          } else {
            // Both empty - nothing to do, but still clear the UI state
            console.log('Both carts are empty');
            dispatch({ type: "CLEAR_UI_CART" });
            
            // Even though there was nothing to merge, set the merged flag
            // to prevent additional merge attempts on refresh
            saveToLocalStorage('plastik-cart-merged-flag', {
              merged: true,
              timestamp: Date.now(),
              mergeCount: 0
            });
          }
        }
      } catch (error) {
        console.error("Error loading cart from API:", error);
        // If API fails, we'll keep the localStorage cart as fallback
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    }
    
    // Run this effect whenever auth status changes
    fetchCart();
    
    // Create a cleanup function to prevent memory leaks
    return () => {
      console.log('Cart effect cleanup');
    };
  }, [status, session, getFromLocalStorage, saveToLocalStorage]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    // Don't save while loading or if cart is empty on initial load
    if (!state.isLoading) {
      // Only save to localStorage for unauthenticated users
      // Authenticated users should use the database as source of truth
      if (status === 'unauthenticated') {
        console.log('Saving cart to localStorage (unauthenticated user)');
        saveToLocalStorage('plastik-cart', {
          ...state,
          timestamp: Date.now() // Add timestamp to track when the cart was last updated
        });
      } else if (status === 'authenticated') {
        // For authenticated users, we only want to keep UI state in localStorage
        // but not the items themselves to prevent duplicate merging on refresh
        console.log('Saving cart UI state only to localStorage (authenticated user)');
        saveToLocalStorage('plastik-cart', {
          isOpen: state.isOpen,
          isLoading: state.isLoading,
          items: [], // Empty array to prevent duplicate merging
          timestamp: Date.now()
        });
      }
    }
  }, [state, state.items, state.isLoading, saveToLocalStorage, status]);

  // Handle syncing cart changes to the API
  const syncCartAction = useCallback(async (action: CartAction) => {
    // Skip syncing for SET_LOADING, LOAD_CART, TOGGLE_CART, and CLEAR_UI_CART actions
    if (action.type === 'SET_LOADING' || 
        action.type === 'LOAD_CART' || 
        action.type === 'TOGGLE_CART' ||
        action.type === 'CLEAR_UI_CART') {
      return;
    }
    
    try {
      // Update localStorage based on authentication status
      const currentState = cartReducer(state, action);
      
      if (status === 'unauthenticated') {
        // For unauthenticated users, save everything to localStorage
        saveToLocalStorage('plastik-cart', {
          ...currentState,
          timestamp: Date.now()
        });
      } else if (status === 'authenticated') {
        // For authenticated users, only save UI state to localStorage
        saveToLocalStorage('plastik-cart', {
          isOpen: currentState.isOpen,
          isLoading: currentState.isLoading,
          items: [], // Empty array to prevent duplicate merging
          timestamp: Date.now()
        });
      }
      
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