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
import "./globals.css"

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
            <CartProvider>
              <NavBar />
              <main className="flex-1">{children}</main>
              <Footer />
              <Toaster />
            </CartProvider>
          </ThemeProvider>
        </NextAuthProvider>
      </body>
    </html>
  )
}

