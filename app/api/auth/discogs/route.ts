import { NextResponse } from "next/server"
import { getRequestToken } from "@/lib/discogs-auth"

export async function GET(request: Request) {
  try {
    // Validate environment variables
    if (!process.env.DISCOGS_CONSUMER_KEY || !process.env.DISCOGS_CONSUMER_SECRET) {
      console.error("Missing Discogs API credentials")
      return NextResponse.json(
        { error: "Discogs API is not properly configured. Please check your environment variables." },
        { status: 500 },
      )
    }

    const { searchParams } = new URL(request.url)
    const callbackUrl = searchParams.get("callbackUrl")

    if (!callbackUrl) {
      return NextResponse.json({ error: "Callback URL is required" }, { status: 400 })
    }

    const { oauth_token, oauth_token_secret } = await getRequestToken(callbackUrl)

    // Store the token secret temporarily
    const response = NextResponse.json({ oauth_token })
    response.cookies.set("oauth_token_secret", oauth_token_secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 3600, // 1 hour
    })

    return response
  } catch (error) {
    console.error("Discogs auth error:", error)
    return NextResponse.json(
      {
        error: "Failed to initialize Discogs authentication",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

