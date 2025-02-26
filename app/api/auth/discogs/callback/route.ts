import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getAccessToken, verifyIdentity } from "@/lib/discogs-auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const oauth_token = searchParams.get("oauth_token")
    const oauth_verifier = searchParams.get("oauth_verifier")
    const cookieStore = cookies()
    const oauth_token_secret = cookieStore.get("oauth_token_secret")?.value

    if (!oauth_token || !oauth_verifier || !oauth_token_secret) {
      return NextResponse.json({ error: "Invalid OAuth callback" }, { status: 400 })
    }

    // Get access token
    const { access_token, access_token_secret } = await getAccessToken(oauth_token, oauth_token_secret, oauth_verifier)

    // Verify the identity to ensure we have the correct permissions
    const identity = await verifyIdentity(access_token, access_token_secret)

    // Store the access token securely
    // In a real application, you should encrypt these tokens before storing them
    await prisma.discogsAuth.upsert({
      where: { username: identity.username },
      update: {
        accessToken: access_token,
        accessTokenSecret: access_token_secret,
        lastVerified: new Date(),
      },
      create: {
        username: identity.username,
        accessToken: access_token,
        accessTokenSecret: access_token_secret,
        lastVerified: new Date(),
      },
    })

    // Clear the temporary oauth_token_secret cookie
    const response = NextResponse.redirect(new URL("/dashboard/settings", request.url))
    response.cookies.delete("oauth_token_secret")

    return response
  } catch (error) {
    console.error("Discogs callback error:", error)
    return NextResponse.redirect(new URL("/dashboard/settings?error=Failed to authenticate with Discogs", request.url))
  }
}

