import type React from "react"
import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { DashboardNav } from "@/components/dashboard/nav"
import { authOptions } from "@/lib/auth"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <div className="container grid flex-1 md:grid-cols-[200px_1fr]">
      <aside className="hidden w-[200px] flex-col md:flex">
        <DashboardNav />
      </aside>
      <main className="flex w-full flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  )
}

