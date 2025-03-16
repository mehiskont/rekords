"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Menu, ShoppingCart, User, X, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useCart } from "@/contexts/cart-context"
import { Cart } from "@/components/cart"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

export function NavBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { data: session, status } = useSession()
  const { state, dispatch } = useCart()
  const [mounted, setMounted] = useState(false)

  // Fix hydration issues with session and ensure components render properly
  useEffect(() => {
    setMounted(true)
  }, [])

  const cartItemCount = state.items.reduce((sum, item) => sum + item.quantity, 0)

  const handleCartClick = () => {
    dispatch({ type: "TOGGLE_CART" })
  }

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/50"
            >
              Plastik Records
            </Link>
            <div className="hidden">
              <Link
                href="/"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Home
              </Link>
              <Link
                href="/about"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                About
              </Link>
              <Link
                href="/contact"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Contact
              </Link>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="relative" onClick={handleCartClick}>
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium flex items-center justify-center text-primary-foreground">
                  {cartItemCount}
                </span>
              )}
            </Button>
            {!mounted ? null : status === "loading" ? (
              <Button variant="ghost" size="icon" disabled>
                <User className="h-5 w-5 opacity-50" />
              </Button>
            ) : session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      {session.user.name && <p className="font-medium">{session.user.name}</p>}
                      {session.user.email && (
                        <p className="w-[200px] truncate text-sm text-muted-foreground">
                          {session.user.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onSelect={(event) => {
                      event.preventDefault();
                      // Clear cart before logout
                      dispatch({ type: "CLEAR_CART" });
                      // Remove cart from localStorage
                      if (typeof window !== 'undefined') {
                        localStorage.removeItem('plastik-cart');
                      }
                      signOut({ callbackUrl: '/' });
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth/signin">
                <Button variant="primary">Sign In</Button>
              </Link>
            )}
          </div>

          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col gap-4">
              <Link
                href="/"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Home
              </Link>
              <Link
                href="/about"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                About
              </Link>
              <Link
                href="/contact"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Contact
              </Link>
            </div>
            <div className="flex items-center gap-4 mt-4 pt-4 border-t">
              <ThemeToggle />
              <Button variant="ghost" size="icon" className="relative" onClick={handleCartClick}>
                <ShoppingCart className="h-5 w-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium flex items-center justify-center text-primary-foreground">
                    {cartItemCount}
                  </span>
                )}
              </Button>
              {!mounted ? null : status === "loading" ? (
                <Button variant="ghost" size="icon" disabled>
                  <User className="h-4 w-4 opacity-50" />
                </Button>
              ) : session ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    <span>{session.user.name || session.user.email}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Link href="/dashboard" className="text-sm pl-6 py-1 hover:text-primary">
                      Dashboard
                    </Link>
                    <Link href="/dashboard/profile" className="text-sm pl-6 py-1 hover:text-primary">
                      Profile
                    </Link>
                    <button 
                      onClick={() => {
                        // Clear cart before logout
                        dispatch({ type: "CLEAR_CART" });
                        // Remove cart from localStorage
                        if (typeof window !== 'undefined') {
                          localStorage.removeItem('plastik-cart');
                        }
                        signOut({ callbackUrl: '/' });
                      }}
                      className="text-sm pl-6 py-1 hover:text-primary text-left flex items-center gap-2"
                    >
                      <LogOut className="h-3 w-3" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              ) : (
                <Link href="/auth/signin">
                  <Button variant="primary">Sign In</Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
      <Cart />
    </nav>
  )
}

