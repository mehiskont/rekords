import { redirect } from "next/navigation"

// This page is no longer needed - redirect to dashboard
export default function OrdersPage() {
  redirect("/dashboard")
}

