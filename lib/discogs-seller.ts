import { prisma } from "@/lib/prisma"
import OAuth from "oauth-1.0a"
import crypto from "crypto"

const DISCOGS_API_URL = "https://api.discogs.com"
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

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

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function getSellerToken(username: string = process.env.DISCOGS_USERNAME!) {
  try {
    const auth = await prisma.discogsAuth.findUnique({
      where: { username },
    })

    if (!auth) {
      throw new Error("No Discogs authentication found")
    }

    // Check if token needs to be refreshed
    if (auth.lastVerified < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
      await verifySellerToken(auth.accessToken, auth.accessTokenSecret)
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

export async function deleteDiscogsListing(listingId: string, retryCount = 0): Promise<boolean> {
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

    // Log the response for debugging
    console.log("Discogs delete response:", {
      listingId,
      status: response.status,
      statusText: response.statusText,
      timestamp: new Date().toISOString(),
    })

    if (response.status === 404) {
      console.log(`Listing ${listingId} already deleted or not found`)
      return true
    }

    if (!response.ok) {
      // If we get a rate limit response, retry after delay
      if (response.status === 429 && retryCount < MAX_RETRIES) {
        const retryAfter = Number.parseInt(response.headers.get("Retry-After") || "1", 10)
        await delay(retryAfter * 1000)
        return deleteDiscogsListing(listingId, retryCount + 1)
      }

      throw new Error(`Failed to delete listing: ${response.status} ${response.statusText}`)
    }

    return true
  } catch (error) {
    console.error(`Error deleting Discogs listing ${listingId}:`, error)

    // Retry on failure if we haven't exceeded max retries
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying delete for listing ${listingId} (attempt ${retryCount + 1}/${MAX_RETRIES})`)
      await delay(RETRY_DELAY * Math.pow(2, retryCount))
      return deleteDiscogsListing(listingId, retryCount + 1)
    }

    throw error
  }
}

export async function removeFromDiscogsInventory(listingId: string): Promise<boolean> {
  try {
    console.log(`Attempting to remove listing ${listingId} from Discogs inventory`)
    const success = await deleteDiscogsListing(listingId)

    if (success) {
      console.log(`Successfully removed listing ${listingId} from Discogs inventory`)
      return true
    } else {
      console.error(`Failed to remove listing ${listingId} from Discogs inventory`)
      return false
    }
  } catch (error) {
    console.error(`Error removing listing ${listingId} from Discogs inventory:`, error)
    // You might want to implement a notification system or queue failed deletions for later
    return false
  }
}

/**
 * Gets the current quantity of a Discogs listing using OAuth authentication
 */
export async function getDiscogsListingQuantity(listingId: string, retryCount = 0): Promise<number | null> {
  try {
    const { accessToken, accessTokenSecret } = await getSellerToken()
    
    const requestData = {
      url: `${DISCOGS_API_URL}/marketplace/listings/${listingId}`,
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
    
    // If listing not found, return null
    if (response.status === 404) {
      console.log(`Listing ${listingId} not found`)
      return null
    }
    
    if (!response.ok) {
      // If rate limited, retry after delay
      if (response.status === 429 && retryCount < MAX_RETRIES) {
        const retryAfter = Number.parseInt(response.headers.get("Retry-After") || "1", 10)
        await delay(retryAfter * 1000)
        return getDiscogsListingQuantity(listingId, retryCount + 1)
      }
      
      throw new Error(`Failed to get listing: ${response.status} ${response.statusText}`)
    }
    
    const listing = await response.json()
    return parseInt(listing.quantity || "1", 10)
  } catch (error) {
    console.error(`Error getting Discogs listing quantity for ${listingId}:`, error)
    
    // Retry on failure if we haven't exceeded max retries
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying get quantity for listing ${listingId} (attempt ${retryCount + 1}/${MAX_RETRIES})`)
      await delay(RETRY_DELAY * Math.pow(2, retryCount))
      return getDiscogsListingQuantity(listingId, retryCount + 1)
    }
    
    return null
  }
}

/**
 * Updates the quantity of a Discogs listing using OAuth authentication
 */
export async function updateDiscogsListingQuantity(listingId: string, newQuantity: number, retryCount = 0): Promise<boolean> {
  try {
    if (newQuantity <= 0) {
      console.log(`Quantity is ${newQuantity}, deleting listing ${listingId} instead of updating`)
      return deleteDiscogsListing(listingId)
    }
    
    const { accessToken, accessTokenSecret } = await getSellerToken()
    
    // First get the current listing details needed for the update
    const getListing = {
      url: `${DISCOGS_API_URL}/marketplace/listings/${listingId}`,
      method: "GET",
    }
    
    const getHeaders = oauth.toHeader(
      oauth.authorize(getListing, {
        key: accessToken,
        secret: accessTokenSecret,
      }),
    )
    
    const getResponse = await fetch(getListing.url, {
      headers: {
        ...getHeaders,
        "User-Agent": "PlastikRecordStore/1.0",
      },
    })
    
    if (!getResponse.ok) {
      if (getResponse.status === 404) {
        console.log(`Listing ${listingId} not found when trying to update quantity`)
        return true
      }
      
      throw new Error(`Failed to get listing for quantity update: ${getResponse.status} ${getResponse.statusText}`)
    }
    
    const listing = await getResponse.json()
    
    // Now update the listing with the new quantity
    const requestData = {
      url: `${DISCOGS_API_URL}/marketplace/listings/${listingId}`,
      method: "POST",
    }
    
    const headers = oauth.toHeader(
      oauth.authorize(requestData, {
        key: accessToken,
        secret: accessTokenSecret,
      }),
    )
    
    // Prepare update data using existing listing values
    const updateData = {
      release_id: listing.release.id,
      condition: listing.condition,
      price: listing.price.value,
      status: listing.status || "For Sale",
      quantity: newQuantity
    }
    
    const response = await fetch(requestData.url, {
      method: "POST",
      headers: {
        ...headers,
        "User-Agent": "PlastikRecordStore/1.0",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    })
    
    if (!response.ok) {
      // If rate limited, retry after delay
      if (response.status === 429 && retryCount < MAX_RETRIES) {
        const retryAfter = Number.parseInt(response.headers.get("Retry-After") || "1", 10)
        await delay(retryAfter * 1000)
        return updateDiscogsListingQuantity(listingId, newQuantity, retryCount + 1)
      }
      
      throw new Error(`Failed to update listing quantity: ${response.status} ${response.statusText}`)
    }
    
    console.log(`Successfully updated listing ${listingId} quantity to ${newQuantity} via OAuth`)
    return true
  } catch (error) {
    console.error(`Error updating Discogs listing quantity for ${listingId}:`, error)
    
    // Retry on failure if we haven't exceeded max retries
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying update quantity for listing ${listingId} (attempt ${retryCount + 1}/${MAX_RETRIES})`)
      await delay(RETRY_DELAY * Math.pow(2, retryCount))
      return updateDiscogsListingQuantity(listingId, newQuantity, retryCount + 1)
    }
    
    return false
  }
}

