import { prisma } from "@/lib/prisma"
import { verifyIdentity } from "@/lib/discogs-auth"

async function verifyDiscogsAuth() {
  try {
    console.log("Checking DiscogsAuth in database...")

    const auth = await prisma.discogsAuth.findFirst({
      where: {
        username: process.env.DISCOGS_USERNAME,
      },
    })

    if (!auth) {
      console.log("❌ No Discogs authentication found in database")
      console.log("Please complete the OAuth flow by visiting /dashboard/settings")
      return
    }

    console.log("✓ Found DiscogsAuth record for:", auth.username)
    console.log("Last verified:", auth.lastVerified)

    console.log("\nVerifying token with Discogs API...")
    const identity = await verifyIdentity(auth.accessToken, auth.accessTokenSecret)

    console.log("✓ Token verified successfully!")
    console.log("Authenticated as:", identity.username)
    console.log("Resource URL:", identity.resource_url)
  } catch (error) {
    console.error("Error verifying Discogs auth:", error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyDiscogsAuth()

