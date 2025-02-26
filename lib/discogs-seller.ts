import { prisma } from "@/lib/prisma"
import OAuth from "oauth-1.0a"
import crypto from "crypto"

const DISCOGS_API_URL = "https://api.discogs.com"

// Update the OAuth configuration to use new environment variable names
const oauth = new OAuth({
  consumer: {
    key: process.env.DISCOGS_CONSUMER_KEY!,
    secret: process.env.DISCOGS_CONSUMER_SECRET!,
  },
  signature_method: "HMAC-SHA1",
  hash_function(base_string, key) {
    return crypto.createHmac("sha1", key).update(base_string).digest("base64")
  },
})

export async function getSellerToken(username: string = process.env.DISCOGS_USERNAME!) {
  try {
    const auth = await prisma.discogsAuth.findUnique({
      where: { username },
    })

    if (!auth) {
      throw new Error("No Discogs authentication found")
    }

    // Check if token needs to be refreshed (optional)
    if (auth.lastVerified < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
      // Token is older than 24 hours, verify it's still valid
      await verifySellerToken(auth.accessToken, auth.accessTokenSecret)

      // Update lastVerified timestamp
      await prisma.discogsAuth.update({
        where: { username },
        data: { lastVerified: new Date() },
      })
    }

    return {
      accessToken: auth.accessToken,
      accessTokenSecret: auth.accessTokenSecret,
    }
  } catch (error) {
    console.error("Error getting seller token:", error)
    throw error
  }
}

async function verifySellerToken(accessToken: string, accessTokenSecret: string) {
  const requestData = {
    url: `${DISCOGS_API_URL}/oauth/identity`,
    method: "GET",
  }

  const headers = oauth.toHeader(
    oauth.authorize(requestData, {
      key: accessToken,
      secret: accessTokenSecret,
    }),
  )

  const response = await fetch(requestData.url, {
    headers: {
      ...headers,
      "User-Agent": "PlastikRecordStore/1.0",
    },
  })

  if (!response.ok) {
    throw new Error("Invalid or expired seller token")
  }

  return true
}

export async function deleteDiscogsListing(listingId: string) {
  try {
    const { accessToken, accessTokenSecret } = await getSellerToken()

    const requestData = {
      url: `${DISCOGS_API_URL}/marketplace/listings/${listingId}`,
      method: "DELETE",
    }

    const headers = oauth.toHeader(
      oauth.authorize(requestData, {
        key: accessToken,
        secret: accessTokenSecret,
      }),
    )

    const response = await fetch(requestData.url, {
      method: "DELETE",
      headers: {
        ...headers,
        "User-Agent": "PlastikRecordStore/1.0",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to delete listing: ${response.statusText}`)
    }

    return true
  } catch (error) {
    console.error(`Error deleting Discogs listing ${listingId}:`, error)
    throw error
  }
}

// Update this function to use seller token when needed
export async function removeFromDiscogsInventory(listingId: string) {
  try {
    await deleteDiscogsListing(listingId)
    console.log(`Successfully removed listing ${listingId} from Discogs inventory`)
    return true
  } catch (error) {
    console.error(`Failed to remove listing ${listingId} from Discogs inventory:`, error)
    // You might want to implement retry logic or queue failed deletions for later
    return false
  }
}

