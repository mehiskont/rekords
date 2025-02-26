import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Get the most recent Discogs auth
    const auth = await prisma.discogsAuth.findFirst({
      orderBy: { lastVerified: "desc" },
    })

    if (!auth) {
      return NextResponse.json({ isConnected: false })
    }

    return NextResponse.json({
      isConnected: true,
      username: auth.username,
      lastVerified: auth.lastVerified,
    })
  } catch (error) {
    console.error("Error checking Discogs auth status:", error)
    return NextResponse.json({ error: "Failed to check Discogs connection status" }, { status: 500 })
  }
}

