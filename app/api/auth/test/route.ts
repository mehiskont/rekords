import { getServerSession } from "next-auth/next"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { authenticated: false, message: "Not authenticated" },
        { status: 401 }
      )
    }
    
    return NextResponse.json({ 
      authenticated: true,
      user: {
        email: session.user?.email,
        name: session.user?.name,
        id: session.user?.id
      }
    })
  } catch (error) {
    console.error("Auth test error:", error)
    return NextResponse.json(
      { 
        error: "Authentication test failed",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}