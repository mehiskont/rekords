import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { DashboardNav } from "@/components/dashboard/nav"
import { authOptions } from "@/lib/auth"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <div className="container grid flex-1 gap-12 md:grid-cols-[200px_1fr]">
      <aside className="hidden w-[200px] flex-col md:flex">
        <DashboardNav />
      </aside>
      <main className="flex w-full flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          </div>
          <div className="grid gap-4">{/* Add order history and other dashboard content here */}</div>
        </div>
      </main>
    </div>
  )
}

