import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { getServerSession } from "next-auth"
import { ThemeProvider } from "@/components/theme-provider"
import { NavBar } from "@/components/nav-bar"
import { Footer } from "@/components/footer"
import { Toaster } from "@/components/ui/toaster"
import NextAuthProvider from "@/components/next-auth-provider"
import { CartProvider } from "@/contexts/cart-context"
import { authOptions } from "@/lib/auth"
import Script from "next/script"
import dynamic from "next/dynamic"
import "./globals.css"

// Dynamically import cart merging logic to ensure it only runs client-side
const CartMergeHandler = dynamic(() => import('@/components/cart-merge-handler'), { 
  ssr: false 
})

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Plastik Records",
  description: "",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <NextAuthProvider session={session}>
          <ThemeProvider>
            {/* Make sure CartProvider is only used in client components */}
            <CartProvider>
              <div className="flex min-h-screen flex-col">
                <NavBar />
                <main className="flex-1">{children}</main>
                <Footer />
                <Toaster />
                {/* Cart merge handler for session-based cart management */}
                <CartMergeHandler />
              </div>
            </CartProvider>
          </ThemeProvider>
        </NextAuthProvider>
        
        {/* Browser tab change detection for keeping cart in sync */}
        <Script id="tab-sync" strategy="afterInteractive">
          {`
          // BroadcastChannel allows communication between tabs
          let cartChannel;
          
          // Only create on client side, and only if the API is available
          if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            cartChannel = new BroadcastChannel('plastik-cart-sync');
            
            // When this tab gets focus, request latest cart data
            window.addEventListener('focus', function() {
              console.log('Tab focused, requesting latest cart data');
              cartChannel.postMessage({ type: 'REQUEST_CART' });
            });
            
            // Listen for messages from other tabs
            cartChannel.onmessage = function(e) {
              if (e.data.type === 'REQUEST_CART') {
                // Another tab is requesting cart data, send what we have
                const cart = localStorage.getItem('plastik-cart');
                if (cart) {
                  cartChannel.postMessage({ 
                    type: 'CART_DATA', 
                    data: JSON.parse(cart),
                    timestamp: Date.now()
                  });
                }
              } else if (e.data.type === 'CART_DATA') {
                // We received cart data from another tab
                // Only update if it's newer than our data
                const ourCart = localStorage.getItem('plastik-cart');
                if (ourCart) {
                  const ourCartData = JSON.parse(ourCart);
                  // If our cart is empty or the received cart is newer, use it
                  if (!ourCartData.items?.length || 
                      (e.data.timestamp && (!ourCartData.timestamp || e.data.timestamp > ourCartData.timestamp))) {
                    localStorage.setItem('plastik-cart', JSON.stringify({
                      ...e.data.data,
                      timestamp: e.data.timestamp
                    }));
                    console.log('Updated cart from another tab');
                    // Force a page refresh to update UI
                    window.location.reload();
                  }
                } else {
                  // We have no cart, so use the received one
                  localStorage.setItem('plastik-cart', JSON.stringify({
                    ...e.data.data,
                    timestamp: e.data.timestamp
                  }));
                  console.log('Received initial cart from another tab');
                  // Force a page refresh to update UI
                  window.location.reload();
                }
              }
            };
          }
          `}
        </Script>
      </body>
    </html>
  )
}

