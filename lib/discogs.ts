import { getCachedData, setCachedData } from "./redis"
import { fetchWithRetry, BatchProcessor } from "./utils"
import type { DiscogsRecord, DiscogsApiResponse, DiscogsInventoryOptions } from "@/types/discogs"
import { log } from "@/lib/logger"
import { prisma } from "@/lib/prisma"

const CACHE_TTL = 86400 // 24 hours
const BASE_URL = "https://api.discogs.com"

// Create a batch processor for shipping price requests with larger batch size
const shippingPriceProcessor = new BatchProcessor<string, number>(
  async (listingIds) => {
    // Create an array to store all request promises
    const requestPromises = listingIds.map(async (listingId) => {
      try {
        const response = await fetchWithRetry(
          `${BASE_URL}/marketplace/listings/${listingId}/shipping/fee?currency=USD`,
          {
            headers: {
              Authorization: `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
              "User-Agent": "PlastikRecordStore/1.0",
            },
            retryOptions: {
              maxRetries: 3,
              baseDelay: 1000,
              maxDelay: 5000,
            },
          },
        )

        if (response.status === 404 || !response.ok) {
          return 5.0; // Default price for not found or errors
        }

        const data = await response.json()
        return data.fee?.value || 5.0
      } catch (error) {
        return 5.0 // Default shipping price on error
      }
    });

    // Execute all requests in parallel and return results
    return Promise.all(requestPromises);
  },
  { maxBatchSize: 20, maxWaitTime: 1000 },
)

async function fetchShippingPrice(listingId: string): Promise<number> {
  const cacheKey = `shipping:${listingId}`

  try {
    const cachedPrice = await getCachedData(cacheKey)
    if (cachedPrice) {
      return Number(cachedPrice)
    }

    const price = await shippingPriceProcessor.add(listingId)
    await setCachedData(cacheKey, price.toString(), 7 * 24 * 60 * 60) // Cache for 7 days
    return price
  } catch (error) {
    return 5.0 // Default shipping price
  }
}

async function fetchFullReleaseData(releaseId: string): Promise<any> {
  const cacheKey = `release:${releaseId}`

  try {
    const cachedData = await getCachedData(cacheKey)
    if (cachedData) {
      return JSON.parse(cachedData)
    }

    const response = await fetchWithRetry(`${BASE_URL}/releases/${releaseId}`, {
      headers: {
        Authorization: `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
        "User-Agent": "PlastikRecordStore/1.0",
      },
    })

    const data = await response.json()
    await setCachedData(cacheKey, JSON.stringify(data), 30 * 24 * 60 * 60) // Cache for 30 days
    return data
  } catch (error) {
    return null
  }
}

async function mapListingToRecord(listing: any): Promise<DiscogsRecord> {
  try {
    const shippingPrice = await fetchShippingPrice(listing.id?.toString() || "")
    const price = listing.price?.value ? Number(listing.price.value) : listing.price ? Number(listing.price) : 0

    // Process listing data

    // Extract weight information from the listing
    let weight = listing.weight || listing.release?.weight || 0
    let weightSource = "direct"

    // If no direct weight is available, try to get it from the formats
    if (!weight && listing.release?.formats && Array.isArray(listing.release.formats)) {
      for (const format of listing.release.formats) {
        if (format.weight) {
          weight = Number(format.weight)
          weightSource = "format.weight"
          break
        }
        // Check format descriptions for weight information
        if (format.descriptions && Array.isArray(format.descriptions)) {
          for (const desc of format.descriptions) {
            if (typeof desc === "string") {
              const weightMatch = desc.match(/(\d+)g/i)
              if (weightMatch && weightMatch[1]) {
                weight = Number(weightMatch[1])
                weightSource = "format.descriptions"
                break
              }
            }
          }
          if (weight) break
        }
      }
    }

    // If still no weight found, use the default based on format
    if (!weight) {
      if (listing.format?.includes("LP") || listing.format?.includes('12"')) {
        weight = 180 // Default weight for 12" vinyl
        weightSource = "default-12"
      } else if (listing.format?.includes('7"')) {
        weight = 40 // Default weight for 7" vinyl
        weightSource = "default-7"
      } else if (listing.format?.includes('10"')) {
        weight = 100 // Default weight for 10" vinyl
        weightSource = "default-10"
      } else {
        weight = 180 // Default fallback weight
        weightSource = "default-fallback"
      }
    }

    // For multi-disc releases, multiply the weight
    const quantity = listing.format_quantity || listing.release?.format_quantity || 1
    weight = weight * quantity

    const weight_unit = "g"

    return {
      id: Number(listing.id) || 0,
      title: String(listing.release?.title || "Untitled"),
      artist: String(listing.release?.artist || "Unknown Artist"),
      price: price,
      shipping_price: Number(shippingPrice),
      cover_image: String(listing.release?.thumbnail || "/placeholder.svg"),
      condition: String(listing.condition || "Unknown"),
      status: String(listing.status || ""),
      label: String(listing.release?.label || "Unknown Label"),
      catalogNumber: String(listing.release?.catalog_number || ""),
      release: String(listing.release?.id || ""),
      styles: Array.isArray(listing.release?.styles) ? listing.release.styles.map(String) : [],
      format: Array.isArray(listing.release?.format)
        ? listing.release.format.map(String)
        : [String(listing.release?.format || "Unknown")],
      country: String(listing.release?.country || ""),
      released: String(listing.release?.year || ""),
      date_added: String(listing.posted || ""),
      genres: Array.isArray(listing.release?.genres) ? listing.release.genres.map(String) : [],
      quantity_available: Number(listing.quantity || 1),
      weight: weight,
      weight_unit: weight_unit,
      format_quantity: listing.format_quantity || listing.release?.format_quantity,
    }
  } catch (error) {
    console.error("Error mapping listing to record:", error)
    return {
      id: Number(listing.id) || 0,
      title: String(listing.release?.title || "Error Loading Record"),
      artist: String(listing.release?.artist || "Unknown Artist"),
      price: 0,
      shipping_price: 5,
      cover_image: "/placeholder.svg",
      condition: "Unknown",
      status: "",
      label: "Unknown Label",
      catalogNumber: "",
      release: "",
      styles: [],
      format: ["Unknown"],
      country: "",
      released: "",
      date_added: "",
      genres: [],
      quantity_available: 0,
      weight: 180, // Default weight for error cases
      weight_unit: "g",
      format_quantity: listing.format_quantity || listing.release?.format_quantity,
    }
  }
}

function logApiError(endpoint: string, error: any) {
  console.error(`Discogs API Error - ${endpoint}:`, {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  })
}

export async function removeFromDiscogsInventory(listingId: string): Promise<boolean> {
  log(`Attempting to remove listing ${listingId} from Discogs inventory`)

  try {
    const response = await fetchWithRetry(`${BASE_URL}/marketplace/listings/${listingId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
        "User-Agent": "PlastikRecordStore/1.0",
      },
      retryOptions: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 5000,
      },
    })

    log(`Discogs API response status: ${response.status}`)

    if (response.ok) {
      log(`Successfully removed listing ${listingId} from Discogs inventory`)
      return true
    } else {
      const errorText = await response.text()
      log(
        `Failed to remove listing ${listingId} from Discogs inventory. Status: ${response.status}, Error: ${errorText}`,
        "error",
      )
      return false
    }
  } catch (error) {
    log(
      `Error removing listing ${listingId} from Discogs inventory: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      "error",
    )
    return false
  }
}

/**
 * Updates the inventory for a Discogs listing by either reducing quantity or removing it
 */
export async function updateDiscogsInventory(
  listingId: string,
  quantityPurchased: number = 1
): Promise<boolean> {
  log(`Updating Discogs inventory for listing ${listingId}, quantity: ${quantityPurchased}`)
  
  try {
    // STEP 1: Verify we have valid credentials
    if (!process.env.DISCOGS_API_TOKEN) {
      log("Missing Discogs API token", "error")
      return false
    }
    
    try {
      // First method: Try the direct OAuth seller method
      log(`Attempting direct OAuth deletion for Discogs listing ${listingId}`)
      const { deleteDiscogsListing } = await import('@/lib/discogs-seller');
      
      const oauthResult = await deleteDiscogsListing(listingId);
      if (oauthResult) {
        log(`✅ Successfully deleted listing ${listingId} using OAuth seller authentication`)
        return true;
      }
    } catch (error) {
      log(`OAuth deletion attempt failed: ${error instanceof Error ? error.message : String(error)}`, "error")
      // Continue to next method
    }
    
    try {
      // Second method: Try token-based listing update/delete
      const listingUrl = `${BASE_URL}/marketplace/listings/${listingId}`
      log(`Trying token-based approach. Fetching listing from: ${listingUrl}`)
      
      const listingResponse = await fetch(listingUrl, {
        headers: {
          'Authorization': `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
          'User-Agent': 'PlastikRecordStore/1.0'
        }
      })
      
      if (!listingResponse.ok) {
        if (listingResponse.status === 404) {
          // If listing is already gone, consider it a success
          log(`Listing ${listingId} not found (404) - might already be deleted`)
          return true
        }
        
        const errorText = await listingResponse.text()
        log(`Failed to get listing ${listingId}: ${listingResponse.status} - ${errorText}`, "error")
        throw new Error(`Failed to get listing: ${errorText}`)
      }
      
      const listing = await listingResponse.json()
      log(`Retrieved listing data: ${JSON.stringify(listing)}`)
      
      // STEP 3: Determine if we need to delete or update quantity
      const currentQuantity = parseInt(listing.quantity || "1", 10)
      
      if (currentQuantity <= quantityPurchased) {
        // Delete the listing
        log(`Deleting listing ${listingId} (current qty: ${currentQuantity}, purchased: ${quantityPurchased})`)
        
        const deleteResponse = await fetch(listingUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
            'User-Agent': 'PlastikRecordStore/1.0'
          }
        })
        
        if (!deleteResponse.ok) {
          const errorText = await deleteResponse.text()
          log(`Failed to delete listing ${listingId}: ${deleteResponse.status} - ${errorText}`, "error")
          throw new Error(`Failed to delete listing: ${errorText}`)
        }
        
        log(`✅ Successfully deleted listing ${listingId} via token-based method`)
        return true
      } else {
        // Update quantity
        const newQuantity = currentQuantity - quantityPurchased
        log(`Updating listing ${listingId} to quantity: ${newQuantity}`)
        
        // According to Discogs API documentation
        const updateResponse = await fetch(listingUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
            'User-Agent': 'PlastikRecordStore/1.0',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            release_id: listing.release.id,
            condition: listing.condition,
            price: listing.price.value,
            status: listing.status,
            quantity: newQuantity
          })
        })
        
        if (!updateResponse.ok) {
          const errorText = await updateResponse.text()
          log(`Failed to update listing ${listingId}: ${updateResponse.status} - ${errorText}`, "error")
          throw new Error(`Failed to update listing quantity: ${errorText}`)
        }
        
        const updateResult = await updateResponse.json()
        log(`Update result: ${JSON.stringify(updateResult)}`)
        log(`✅ Successfully updated listing ${listingId} quantity to ${newQuantity}`)
        return true
      }
    } catch (error) {
      log(`Token-based method failed: ${error instanceof Error ? error.message : String(error)}`, "error")
      // Try the third method
    }
    
    // Last resort - try the removeFromDiscogsInventory function directly
    log(`Trying last resort method: direct removal for listing ${listingId}`)
    const result = await removeFromDiscogsInventory(listingId);
    
    if (result) {
      log(`✅ Successfully removed listing ${listingId} using last resort method`)
      return true
    } else {
      log(`❌ All methods failed to remove listing ${listingId}`, "error")
      return false
    }
  } catch (error) {
    log(`Unexpected error updating inventory for ${listingId}: ${error instanceof Error ? error.message : String(error)}`, "error")
    return false
  }
}

/**
 * Helper function to make authenticated requests to Discogs API
 */
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const headers = {
    'Authorization': `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
    'User-Agent': 'PlastikRecordStore/1.0',
    ...(options.headers || {}),
  }
  
  return fetch(url, {
    ...options,
    headers,
  })
}

export async function getDiscogsInventory(
  search?: string,
  sort?: string,
  page = 1,
  perPage = 50,
  options: DiscogsInventoryOptions = {},
): Promise<{ records: DiscogsRecord[]; totalPages: number }> {
  // Include a cacheBuster parameter in the cache key if provided
  const cacheKey = `inventory:${search || "all"}:${sort || "default"}:${page}:${perPage}:${options.category || "all"}:${
    options.sort || "default"
  }:${options.sort_order || "default"}${options.cacheBuster ? `:${options.cacheBuster}` : ''}`

  try {
    const cachedData = await getCachedData(cacheKey)
    if (cachedData) {
      return JSON.parse(cachedData)
    }
  } catch (error) {
    console.error("Cache read error:", error)
  }

  try {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
      status: "For Sale",
    })

    if (options.sort) {
      params.append("sort", options.sort)
    } else if (sort) {
      const sortMap: { [key: string]: string } = {
        date_desc: "listed",
        price_asc: "price",
        price_desc: "price",
        title_asc: "item",
        title_desc: "item",
      }
      params.append("sort", sortMap[sort] || "listed")
    }

    if (options.sort_order) {
      params.append("sort_order", options.sort_order)
    } else if (sort?.includes("desc")) {
      params.append("sort_order", "desc")
    }

    if (search) {
      params.append("q", search)
    }

    const url = `${BASE_URL}/users/${process.env.DISCOGS_USERNAME}/inventory?${params.toString()}`
    // Fetch from Discogs API

    const response = await fetchWithRetry(url, {
      headers: {
        Authorization: `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
        "User-Agent": "PlastikRecordStore/1.0",
      },
    })

    if (!response.ok) {
      logApiError("getDiscogsInventory", new Error(`Discogs API error: ${response.status} ${response.statusText}`))
      throw new Error(`Discogs API error: ${response.status} ${response.statusText}`)
    }

    const data: DiscogsApiResponse = await response.json()
    // Process API response

    if (!data || !data.listings) {
      throw new Error("Invalid data structure received from Discogs API")
    }

    // More strict filtering for available listings - both quantity and status
    const availableListings = data.listings.filter((listing) => 
      listing.quantity > 0 && 
      listing.status === "For Sale"
    )

    // Optimize by batching full release data fetches before mapping listings
    const releaseIds = new Set<string>()
    const releaseDataMap = new Map<string, any>()
    
    if (options.fetchFullReleaseData || (options.sort === "listed" && options.sort_order === "desc")) {
      availableListings.forEach(listing => {
        if (listing.release?.id) {
          releaseIds.add(listing.release.id.toString())
        }
      })
      
      // Fetch all release data in parallel
      const releaseDataPromises = Array.from(releaseIds).map(async (releaseId) => {
        try {
          const data = await fetchFullReleaseData(releaseId)
          return [releaseId, data]
        } catch (error) {
          return [releaseId, null]
        }
      })
      
      const releaseDataResults = await Promise.all(releaseDataPromises)
      releaseDataResults.forEach(([releaseId, data]) => {
        if (data) releaseDataMap.set(releaseId as string, data)
      })
    }
    
    // Now map all listings using the pre-fetched release data
    const records = await Promise.all(
      availableListings.map(async (listing) => {
        const releaseId = listing.release?.id?.toString()
        const fullRelease = releaseId ? releaseDataMap.get(releaseId) : null
        
        const record = await mapListingToRecord(listing)
        
        if (fullRelease) {
          return {
            ...record,
            catalogNumber: fullRelease?.labels?.[0]?.catno?.toString().trim() || record.catalogNumber,
            label: fullRelease?.labels?.[0]?.name || record.label,
          }
        }
        
        return record
      })
    )

    let filteredRecords = records
    if (options.category && options.category !== "everything") {
      filteredRecords = filterRecordsByCategory(records, search || "", options.category)
    }

    const result = {
      records: filteredRecords,
      totalPages: Math.ceil(data.pagination.items / perPage),
    }

    // Cache the result, but with a shorter TTL for the inventory list to maintain freshness
    // This is especially important for availability status
    try {
      // If using cacheBuster, use a very short TTL (2 minutes)
      // Otherwise use a longer TTL but still shorter than before (2 hours instead of 24 hours)
      await setCachedData(cacheKey, JSON.stringify(result), options.cacheBuster ? 120 : 7200) 
    } catch (error) {
      // Silently continue on cache error
    }

    return result
  } catch (error) {
    logApiError("getDiscogsInventory", error)
    console.error("Error fetching inventory:", error)
    return { records: [], totalPages: 0 }
  }
}

export async function getDiscogsRecord(
  id: string,
  options?: { skipCache?: boolean }
): Promise<{ record: DiscogsRecord | null; relatedRecords: DiscogsRecord[] }> {
  const cacheKey = `record:${id}`

  // Allow skipping cache check for fresh data, useful after purchase
  if (!options?.skipCache) {
    try {
      const cachedData = await getCachedData(cacheKey)
      if (cachedData) {
        return JSON.parse(cachedData)
      }
    } catch (error) {
      // Continue if cache read fails
    }
  }

  try {
    const response = await fetchWithRetry(`${BASE_URL}/marketplace/listings/${id}`, {
      headers: {
        Authorization: `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
        "User-Agent": "PlastikRecordStore/1.0",
      },
    })

    const data = await response.json()

    if (data.status !== "For Sale" || data.quantity === 0) {
      return { record: null, relatedRecords: [] }
    }

    const fullRelease = await fetchFullReleaseData(data.release.id.toString())
    const record = await mapListingToRecord({
      ...data,
      release: { ...data.release, ...fullRelease },
    })

    // Get related records using a simpler query with minimal fields
    const { records: allRelatedRecords } = await getDiscogsInventory(undefined, undefined, 1, 4, {
      fetchFullReleaseData: false // Don't fetch full release data for related records
    })
    
    const relatedRecords = allRelatedRecords.filter(
      (relatedRecord) =>
        relatedRecord.id !== record.id &&
        relatedRecord.release !== record.release &&
        relatedRecord.quantity_available > 0,
    )

    const result = { record, relatedRecords }

    // Cache for longer duration - details view is less time-sensitive
    await setCachedData(cacheKey, JSON.stringify(result), 7 * 24 * 60 * 60) // 7 days

    return result
  } catch (error) {
    return { record: null, relatedRecords: [] }
  }
}

function filterRecordsByCategory(records: DiscogsRecord[], searchTerm: string, category: string): DiscogsRecord[] {
  const term = searchTerm.toLowerCase()
  return records.filter((record) => {
    const isVariousArtist =
      record.artist.toLowerCase() === "various" ||
      record.artist.toLowerCase() === "various artists" ||
      record.title.toLowerCase().includes("various")

    switch (category) {
      case "artists":
        if (term === "various") {
          return isVariousArtist
        }
        return record.artist.toLowerCase().includes(term)
      case "releases":
        return record.title.toLowerCase().includes(term)
      case "labels":
        return record.label?.toLowerCase().includes(term)
      default:
        if (term === "various") {
          return isVariousArtist
        }
        return (
          record.title.toLowerCase().includes(term) ||
          record.artist.toLowerCase().includes(term) ||
          record.label?.toLowerCase().includes(term) ||
          record.catalogNumber?.toLowerCase().includes(term)
        )
    }
  })
}

