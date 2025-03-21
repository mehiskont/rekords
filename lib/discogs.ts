import { getCachedData, setCachedData } from "./redis"
import { fetchWithRetry, BatchProcessor } from "./utils"
import type { DiscogsRecord, DiscogsApiResponse, DiscogsInventoryOptions } from "@/types/discogs"
import { log } from "@/lib/logger"
import { prisma } from "@/lib/prisma"

const CACHE_TTL = 86400 // 24 hours
const BASE_URL = "https://api.discogs.com"

// Create a batch processor for shipping price requests with improved caching and rate limiting
const shippingPriceProcessor = new BatchProcessor<string, number>(
  async (listingIds) => {
    // Process in smaller batches to avoid rate limiting
    const batchSize = 5; // Smaller batch size to avoid rate limits
    const batches = [];
    
    for (let i = 0; i < listingIds.length; i += batchSize) {
      batches.push(listingIds.slice(i, i + batchSize));
    }
    
    let allResults: number[] = [];
    
    // Process batches sequentially with short delays between them
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      // Process this batch with concurrent requests
      const batchPromises = batch.map(async (listingId) => {
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
                timeout: 8000, // Add timeout to prevent hanging requests
              },
            },
          );

          if (response.status === 404 || !response.ok) {
            return 5.0; // Default price for not found or errors
          }

          const data = await response.json();
          return data.fee?.value || 5.0;
        } catch (error) {
          log(`Error fetching shipping price for listing ${listingId}`, error, "warn");
          return 5.0; // Default shipping price on error
        }
      });

      // Execute current batch concurrently
      const batchResults = await Promise.all(batchPromises);
      allResults = [...allResults, ...batchResults];
      
      // Add a small delay between batches to avoid rate limiting
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    return allResults;
  },
  { 
    maxBatchSize: 15, 
    maxWaitTime: 800,
    // Add cache function to avoid redundant API calls
    cacheKeyFn: (listingId) => `shipping:${listingId}`,
    cacheTTL: 3600000, // Cache shipping prices for 1 hour (in ms)
    maxConcurrentBatches: 1, // Process one batch at a time
  },
)

async function fetchShippingPrice(listingId: string): Promise<number> {
  try {
    // Always fetch real-time shipping price data - no caching
    const price = await shippingPriceProcessor.add(listingId)
    return price
  } catch (error) {
    log("Error fetching shipping price", error, "error")
    return 5.0 // Default shipping price
  }
}

async function fetchFullReleaseData(releaseId: string): Promise<any> {
  const cacheKey = `release:${releaseId}`

  try {
    // Try to get cached data first
    const cachedData = await getCachedData(cacheKey)
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData)
        if (parsed && typeof parsed === 'object') {
          return parsed
        }
      } catch (parseError) {
        log(`Error parsing cached release data for ${releaseId}`, parseError, "warn")
        // Continue to fetch fresh data on parse error
      }
    }

    // If cache miss or error, fetch from Discogs API with improved error handling
    const response = await fetchWithRetry(`${BASE_URL}/releases/${releaseId}`, {
      headers: {
        Authorization: `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
        "User-Agent": "PlastikRecordStore/1.0",
      },
      retryOptions: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 8000,
      },
    })

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited - log and return minimal data
        log(`Rate limited when fetching release ${releaseId}`, {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries())
        }, "warn")
        
        // Return minimal data structure
        return { id: releaseId, _minimal: true }
      }
      
      throw new Error(`Discogs API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    // Process videos and match them to tracks if possible
    if (data.videos && Array.isArray(data.videos)) {
      // Filter to only YouTube videos for simplicity
      data.videos = data.videos
        .filter((video: any) => video.uri && (
          video.uri.includes('youtube.com') || 
          video.uri.includes('youtu.be')
        ))
        .map((video: any) => ({
          title: video.title || "",
          url: video.uri || "",
          duration: video.duration || "",
          embed: video.embed || false
        }));
    }

    // Process tracks and match with videos if possible
    if (data.tracklist && Array.isArray(data.tracklist) && data.tracklist.length > 0) {
      // Create a simplified and normalized tracklist
      data.processedTracks = data.tracklist.map((track: any) => {
        // Find a matching video for this track if possible
        const matchingVideo = data.videos?.find((video: any) => 
          video.title && track.title && 
          (video.title.toLowerCase().includes(track.title.toLowerCase()) ||
           track.title.toLowerCase().includes(video.title.toLowerCase()))
        );
        
        return {
          position: track.position || "",
          title: track.title || "",
          duration: track.duration || "",
          // Only include video if we have a match
          video: matchingVideo || undefined
        };
      });
    }
    
    // Only cache valid response data
    if (data && typeof data === 'object' && !data.error) {
      // Cache for 30 days - using memory cache + Redis from our improved implementation
      setCachedData(cacheKey, JSON.stringify(data), 30 * 24 * 60 * 60)
    }
    
    return data
  } catch (error) {
    log(`Error fetching release data for ${releaseId}`, error, "error")
    
    // Return minimal data on error so the application can continue
    return { 
      id: releaseId,
      _error: true,
      _errorMessage: error instanceof Error ? error.message : String(error)
    }
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

    // Determine the best image URL - prefer high resolution images
    let coverImage = "/placeholder.svg";
    
    // First check for high-resolution images
    if (listing.release?.images && Array.isArray(listing.release.images) && listing.release.images.length > 0) {
      // Find the primary image or use the first one
      const primaryImage = listing.release.images.find((img: any) => img.type === "primary") || listing.release.images[0];
      
      // Prefer the highest resolution: resource_url > uri > uri150
      coverImage = primaryImage.resource_url || primaryImage.uri || primaryImage.uri150 || "/placeholder.svg";
    } 
    // Fallback to main_release_url if available
    else if (listing.release?.resource_url) {
      coverImage = listing.release.resource_url;
    }
    // Fallback to cover_image if available 
    else if (listing.release?.cover_image) {
      coverImage = listing.release.cover_image;
    }
    // Last resort: use thumbnail
    else if (listing.release?.thumbnail) {
      coverImage = listing.release.thumbnail;
    }
    
    // Include videos and tracks if available
    const videos = listing.release?.videos || [];
    const tracks = listing.release?.processedTracks || [];
    
    return {
      id: Number(listing.id) || 0,
      title: String(listing.release?.title || "Untitled"),
      artist: String(listing.release?.artist || "Unknown Artist"),
      price: price,
      shipping_price: Number(shippingPrice),
      cover_image: coverImage,
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
      videos: videos,
      tracks: tracks,
    }
  } catch (error) {
    console.error("Error mapping listing to record:", error)
    // Try to extract a high-res image even in the error case
    let fallbackCoverImage = "/placeholder.svg";
    try {
      if (listing.release?.images && Array.isArray(listing.release.images) && listing.release.images.length > 0) {
        const primaryImage = listing.release.images.find((img: any) => img.type === "primary") || listing.release.images[0];
        fallbackCoverImage = primaryImage.resource_url || primaryImage.uri || primaryImage.uri150 || "/placeholder.svg";
      } else if (listing.release?.cover_image) {
        fallbackCoverImage = listing.release.cover_image;
      } else if (listing.release?.thumbnail) {
        fallbackCoverImage = listing.release.thumbnail;
      }
    } catch (imgError) {
      // Silently fail and use placeholder
    }
    
    return {
      id: Number(listing.id) || 0,
      title: String(listing.release?.title || "Error Loading Record"),
      artist: String(listing.release?.artist || "Unknown Artist"),
      price: 0,
      shipping_price: 5,
      cover_image: fallbackCoverImage,
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
      videos: [],
      tracks: [],
    }
  }
}

function logApiError(endpoint: string, error: any) {
  console.error(`Discogs API Error - ${endpoint}:`, {
    message: error?.message || String(error),
    stack: error?.stack || 'No stack trace',
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
  log(`Updating Discogs inventory for listing ${listingId}, quantity purchased: ${quantityPurchased}`)
  
  try {
    // STEP 1: Verify we have valid credentials
    if (!process.env.DISCOGS_API_TOKEN) {
      log("Missing Discogs API token", "error")
      return false
    }
    
    // STEP 2: Get the current listing information to check quantity
    const listingUrl = `${BASE_URL}/marketplace/listings/${listingId}`
    log(`Fetching current listing data from: ${listingUrl}`)
    
    try {
      const listingResponse = await fetchWithRetry(listingUrl, {
        headers: {
          'Authorization': `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
          'User-Agent': 'PlastikRecordStore/1.0'
        },
        retryOptions: {
          maxRetries: 2,
          baseDelay: 500,
          maxDelay: 2000,
        },
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
      log(`Found listing ${listingId}: release_id=${listing.release.id}, current quantity=${listing.quantity}`)
      
      // STEP 3: Determine if we need to delete or update quantity
      const currentQuantity = parseInt(listing.quantity || "1", 10)
      
      if (currentQuantity <= quantityPurchased) {
        // Delete the listing completely
        log(`Deleting listing ${listingId} (current qty: ${currentQuantity} <= purchased: ${quantityPurchased})`)
        const deleteResponse = await fetchWithRetry(listingUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
            'User-Agent': 'PlastikRecordStore/1.0'
          },
          retryOptions: {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 5000,
          },
        })
        
        if (!deleteResponse.ok) {
          const errorText = await deleteResponse.text()
          log(`Failed to delete listing ${listingId}: ${deleteResponse.status} - ${errorText}`, "error")
          
          // Try OAuth method as a fallback
          try {
            log(`Attempting OAuth deletion as fallback for ${listingId}`)
            const { deleteDiscogsListing } = await import('@/lib/discogs-seller');
            const oauthResult = await deleteDiscogsListing(listingId);
            
            if (oauthResult) {
              log(`✅ Successfully deleted listing ${listingId} using OAuth fallback`)
              return true
            }
          } catch (oauthError) {
            log(`OAuth fallback failed: ${oauthError instanceof Error ? oauthError.message : String(oauthError)}`, "error")
          }
          
          return false
        }
        
        log(`✅ Successfully deleted listing ${listingId}`)
        return true
      } else {
        // Update quantity - critical to get this right
        const newQuantity = currentQuantity - quantityPurchased
        log(`Updating listing ${listingId} quantity from ${currentQuantity} to ${newQuantity}`)
        
        // According to Discogs API documentation
        const updateData = {
          release_id: listing.release.id,
          condition: listing.condition,
          price: listing.price.value,
          status: listing.status || "For Sale",
          quantity: newQuantity
        }
        
        log(`Update data: ${JSON.stringify(updateData)}`)
        
        const updateResponse = await fetchWithRetry(listingUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
            'User-Agent': 'PlastikRecordStore/1.0',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData),
          retryOptions: {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 5000,
          },
        })
        
        if (!updateResponse.ok) {
          const errorText = await updateResponse.text()
          log(`Failed to update listing ${listingId}: ${updateResponse.status} - ${errorText}`, "error")
          
          // If we can't update quantity, try OAuth update as fallback
          try {
            log(`Attempting OAuth update as fallback for ${listingId}`)
            const { updateDiscogsListingQuantity } = await import('@/lib/discogs-seller');
            const oauthResult = await updateDiscogsListingQuantity(listingId, newQuantity);
            
            if (oauthResult) {
              log(`✅ Successfully updated listing ${listingId} using OAuth fallback`)
              return true
            }
          } catch (oauthError) {
            log(`OAuth update fallback failed: ${oauthError instanceof Error ? oauthError.message : String(oauthError)}`, "error")
          }
          
          return false
        }
        
        try {
          const updateResult = await updateResponse.json()
          log(`Update result: ${JSON.stringify(updateResult)}`)
        } catch (jsonError) {
          // Non-JSON response is okay, just log it
          log(`Update response (non-JSON): ${await updateResponse.text()}`)
        }
        
        log(`✅ Successfully updated listing ${listingId} quantity to ${newQuantity}`)
        return true
      }
    } catch (error) {
      log(`Error updating listing ${listingId}: ${error instanceof Error ? error.message : String(error)}`, "error")
      
      // Try OAuth methods as a complete fallback
      try {
        log(`Attempting OAuth methods as complete fallback for ${listingId}`)
        const { getDiscogsListingQuantity, updateDiscogsListingQuantity, deleteDiscogsListing } = await import('@/lib/discogs-seller');
        
        // First check current quantity
        const currentQty = await getDiscogsListingQuantity(listingId);
        log(`OAuth fallback: current quantity for ${listingId} is ${currentQty}`)
        
        if (currentQty === null || currentQty === 0) {
          log(`Listing ${listingId} not found or already at zero quantity via OAuth`)
          return true
        }
        
        if (currentQty <= quantityPurchased) {
          // Delete listing
          log(`OAuth fallback: deleting listing ${listingId}`)
          const deleteResult = await deleteDiscogsListing(listingId);
          log(deleteResult ? `✅ OAuth fallback: successfully deleted listing ${listingId}` : 
                           `❌ OAuth fallback: failed to delete listing ${listingId}`)
          return deleteResult
        } else {
          // Update quantity
          const newQty = currentQty - quantityPurchased;
          log(`OAuth fallback: updating listing ${listingId} to quantity ${newQty}`)
          const updateResult = await updateDiscogsListingQuantity(listingId, newQty);
          log(updateResult ? `✅ OAuth fallback: successfully updated listing ${listingId}` : 
                           `❌ OAuth fallback: failed to update listing ${listingId}`)
          return updateResult
        }
      } catch (oauthError) {
        log(`Complete OAuth fallback failed: ${oauthError instanceof Error ? oauthError.message : String(oauthError)}`, "error")
        return false
      }
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
  // Generate cache key based on request parameters
  const cacheKey = `inventory:${search || "all"}:${sort || "default"}:${page}:${perPage}:${options.category || "all"}:${options.sort || ""}:${options.sort_order || ""}`;
  
  // Skip cache if explicitly requested
  const useCache = !options.cacheBuster;
  
  if (useCache) {
    try {
      // Try to get cached data first
      const cachedData = await getCachedData(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        if (parsed?.records?.length > 0) {
          log(`Using cached inventory data for key ${cacheKey}`, {}, "info");
          return parsed;
        }
      }
    } catch (cacheError) {
      // Log but continue on cache error
      log(`Cache read error for ${cacheKey}`, cacheError, "warn");
    }
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
    
    // Add improved error handling and retries
    const response = await fetchWithRetry(url, {
      headers: {
        Authorization: `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
        "User-Agent": "PlastikRecordStore/1.0",
      },
      retryOptions: {
        maxRetries: 5,        // Increase retries
        baseDelay: 1000,      // Start with 1s delay
        maxDelay: 10000,      // Max 10s delay between retries
      }
    })

    // Check for circuit breaker synthetic response
    const isCircuitBreaker = response.headers.get("X-Circuit-Breaker") === "true";
    
    if (isCircuitBreaker) {
      log("Circuit breaker active for Discogs API - returning empty result", {}, "warn");
      throw new Error("Circuit breaker active");
    }

    if (!response.ok) {
      logApiError("getDiscogsInventory", new Error(`Discogs API error: ${response.status} ${response.statusText}`))
      throw new Error(`Discogs API error: ${response.status} ${response.statusText}`)
    }

    const data: DiscogsApiResponse = await response.json()
    
    if (!data || !data.listings) {
      throw new Error("Invalid data structure received from Discogs API")
    }

    // More strict filtering for available listings
    const availableListings = data.listings.filter((listing) => {
      const isAvailable = 
        // Must have positive quantity
        (listing.quantity && parseInt(listing.quantity, 10) > 0) && 
        // Must have "For Sale" status
        listing.status === "For Sale" &&
        // Must have a valid price
        (listing.price && parseFloat(listing.price.value || listing.price) > 0);
      
      if (!isAvailable && options.cacheBuster) {
        // Only log when explicitly refreshing to reduce noise
        log(`Filtered out unavailable listing: ID=${listing.id}, title=${listing.release?.title}, quantity=${listing.quantity}, status=${listing.status}`, 
            { price: listing.price }, 
            "info");
      }
      
      return isAvailable;
    })

    // Always fetch full release data to get high-resolution images
    // This might be slightly slower but provides much better image quality
    const shouldFetchFullData = true;
                               
    // Optimize by batching full release data fetches before mapping listings
    const releaseIds = new Set<string>()
    const releaseDataMap = new Map<string, any>()
    
    if (shouldFetchFullData) {
      // Build list of release IDs
      availableListings.forEach(listing => {
        if (listing.release?.id) {
          releaseIds.add(listing.release.id.toString())
        }
      })
      
      // Limit number of parallel requests to avoid rate limiting
      const batchSize = 5;
      const releaseIdBatches = [];
      const releaseIdArray = Array.from(releaseIds);
      
      // Split into batches
      for (let i = 0; i < releaseIdArray.length; i += batchSize) {
        releaseIdBatches.push(releaseIdArray.slice(i, i + batchSize));
      }
      
      // Process batches sequentially to avoid overwhelming the API
      for (const batch of releaseIdBatches) {
        const batchPromises = batch.map(async (releaseId) => {
          try {
            // Check cache first (this uses memory cache from our redis.ts improvements)
            const data = await fetchFullReleaseData(releaseId);
            return [releaseId, data];
          } catch (error) {
            return [releaseId, null];
          }
        });
        
        // Process current batch in parallel
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(([releaseId, data]) => {
          if (data) releaseDataMap.set(releaseId as string, data);
        });
        
        // Small delay between batches to avoid rate limiting
        if (releaseIdBatches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    }
    
    // Now map all listings using the pre-fetched release data
    // Process in smaller batches to avoid memory issues and improve performance
    const batchSize = 10;
    const listingBatches = [];
    
    for (let i = 0; i < availableListings.length; i += batchSize) {
      listingBatches.push(availableListings.slice(i, i + batchSize));
    }
    
    let allRecords: DiscogsRecord[] = [];
    
    // Process listing batches sequentially
    for (const batch of listingBatches) {
      const batchRecords = await Promise.all(
        batch.map(async (listing) => {
          try {
            const releaseId = listing.release?.id?.toString();
            const fullRelease = releaseId ? releaseDataMap.get(releaseId) : null;
            
            const record = await mapListingToRecord(listing);
            
            if (fullRelease) {
              return {
                ...record,
                catalogNumber: fullRelease?.labels?.[0]?.catno?.toString().trim() || record.catalogNumber,
                label: fullRelease?.labels?.[0]?.name || record.label,
              };
            }
            
            return record;
          } catch (error) {
            log(`Error mapping listing ${listing.id}`, error, "error");
            // Return a minimal valid record on error
            return {
              id: Number(listing.id) || 0,
              title: listing.release?.title || "Error Loading Record",
              artist: listing.release?.artist || "Unknown Artist",
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
              weight: 180,
              weight_unit: "g",
              format_quantity: 1,
            };
          }
        })
      );
      
      allRecords = [...allRecords, ...batchRecords];
    }

    let filteredRecords = allRecords;
    if (options.category && options.category !== "everything") {
      filteredRecords = filterRecordsByCategory(allRecords, search || "", options.category);
    }

    const result = {
      records: filteredRecords,
      totalPages: Math.ceil(data.pagination.items / perPage),
    }

    // Cache the result for a short time (5 minutes)
    // This will use both memory cache and Redis from our improved redis.ts
    if (filteredRecords.length > 0) {
      setCachedData(cacheKey, JSON.stringify(result), 300); // 5 minute cache
    }

    return result;
  } catch (error) {
    // Safely log API errors
    logApiError("getDiscogsInventory", error);
    
    // Use logger instead of console.error
    log("Error fetching inventory: " + (error instanceof Error ? error.message : String(error)), {}, "error");
    
    // Return empty result
    return { records: [], totalPages: 0 };
  }
}

export async function getDiscogsRecord(
  id: string,
  options?: { skipCache?: boolean }
): Promise<{ record: DiscogsRecord | null; relatedRecords: DiscogsRecord[] }> {
  // Always fetch fresh record data - no caching

  try {
    const response = await fetchWithRetry(`${BASE_URL}/marketplace/listings/${id}`, {
      headers: {
        Authorization: `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
        "User-Agent": "PlastikRecordStore/1.0",
      },
    })

    // Check for circuit breaker synthetic response
    const isCircuitBreaker = response.headers.get("X-Circuit-Breaker") === "true";
    
    if (isCircuitBreaker) {
      log("Circuit breaker active for Discogs API when fetching record - attempting fallback", {}, "warn");
      // Try to get a cached version if available
      const cacheKey = `record:${id}`
      const cachedData = await getCachedData(cacheKey)
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData)
          if (parsed && typeof parsed === 'object' && parsed.record) {
            log(`Using cached record data for ${id} due to circuit breaker`, {}, "info")
            return parsed
          }
        } catch (parseError) {
          // Continue with null response if cache parsing fails
          log(`Error parsing cached record data for ${id}`, parseError, "warn")
        }
      }
      // If no cache or invalid cache, return null record
      return { record: null, relatedRecords: [] }
    }
    
    const data = await response.json()

    if (!response.ok || data.status !== "For Sale" || data.quantity === 0) {
      return { record: null, relatedRecords: [] }
    }

    // Get full release data which contains videos and tracklist
    const fullRelease = await fetchFullReleaseData(data.release.id.toString())
    
    // Log release data to debug videos and tracklist
    log(`Release data for ${id}:`, {
      has_videos: fullRelease.videos ? fullRelease.videos.length : 0,
      has_tracklist: fullRelease.tracklist ? fullRelease.tracklist.length : 0,
      has_processed_tracks: fullRelease.processedTracks ? fullRelease.processedTracks.length : 0,
    }, "info")
    
    const record = await mapListingToRecord({
      ...data,
      release: { ...data.release, ...fullRelease },
    })
    
    // Log the final record object to see if tracks and videos are included
    log(`Final record for ${id}:`, {
      has_videos: record.videos ? record.videos.length : 0,
      has_tracks: record.tracks ? record.tracks.length : 0,
    }, "info")

    // Get related records using a simpler query with minimal fields
    // We'll fetch a fresh copy of inventory to ensure we have the latest available items
    const { records: allRelatedRecords } = await getDiscogsInventory(undefined, undefined, 1, 20, {
      fetchFullReleaseData: false, // Don't fetch full release data for related records
      cacheBuster: Date.now().toString() // Bypass cache to get fresh inventory
    })
    
    // Apply more strict filtering to ensure we're only showing available records
    const relatedRecords = allRelatedRecords
      .filter(
        (relatedRecord) =>
          // Don't show the current record
          relatedRecord.id !== record.id &&
          // Don't show records from the same release
          relatedRecord.release !== record.release &&
          // Ensure the record is actually available
          relatedRecord.quantity_available > 0 &&
          // Ensure "For Sale" status
          relatedRecord.status === "For Sale"
      )
      // Limit to 4 related records
      .slice(0, 4)
      
    // Log the related records for debugging
    log(`Found ${relatedRecords.length} related records for ${record.title}`, 
      relatedRecords.map(r => ({id: r.id, title: r.title, qty: r.quantity_available}))
    )

    const result = { record, relatedRecords }

    // Cache record data for 30 minutes to provide a fallback during circuit breaker activation
    const cacheKey = `record:${id}`
    setCachedData(cacheKey, JSON.stringify(result), 30 * 60)  // 30 minutes

    return result
  } catch (error) {
    // Log the error
    log("Error fetching record details: " + (error instanceof Error ? error.message : String(error)), {}, "error")
    
    // Return empty result
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

