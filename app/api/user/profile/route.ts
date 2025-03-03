import { getServerSession } from "next-auth/next"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { saveUserCheckoutInfo, getUserProfile, profileToCheckoutInfo } from "@/lib/user"

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const data = await req.json()

  try {
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: data.name,
        email: data.email,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        postalCode: data.postalCode,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}

// Get the user's profile data
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const profile = await getUserProfile(session.user.id)
    return NextResponse.json(profile)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to get profile" }, { status: 500 })
  }
}

// Save checkout information to user profile
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const checkoutInfo = await req.json()
    const updatedUser = await saveUserCheckoutInfo(session.user.id, checkoutInfo)
    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error) {
    console.error("Error saving checkout info:", error)
    return NextResponse.json({ error: "Failed to save checkout information" }, { status: 500 })
  }
}

