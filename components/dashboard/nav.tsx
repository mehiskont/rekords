"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="grid items-start gap-2">
      <Link href="/dashboard">
        <Button variant="ghost" className={cn("w-full justify-start", pathname === "/dashboard" && "bg-muted")}>
          Dashboard
        </Button>
      </Link>
      <Link href="/dashboard/orders">
        <Button variant="ghost" className={cn("w-full justify-start", pathname.startsWith("/dashboard/orders") && "bg-muted")}>
          Orders
        </Button>
      </Link>
      <Link href="/dashboard/profile">
        <Button variant="ghost" className={cn("w-full justify-start", pathname === "/dashboard/profile" && "bg-muted")}>
          Profile
        </Button>
      </Link>
    </nav>
  )
}

