import { NextResponse } from "next/server"
import { getRequestToken } from "@/lib/discogs-auth"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const callbackUrl = searchParams.get("callbackUrl")

    if (!callbackUrl) {
      return NextResponse.json({ error: "Callback URL is required" }, { status: 400 })
    }

    const { oauth_token, oauth_token_secret } = await getRequestToken(callbackUrl)

    // Store the token secret temporarily (you should use a more secure method in production)
    // For example, you could use a server-side session or a secure cookie
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
    return NextResponse.json({ error: "Failed to initialize Discogs authentication" }, { status: 500 })
  }
}

