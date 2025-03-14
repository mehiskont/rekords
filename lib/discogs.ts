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

    // More strict filtering for available listings - both quantity and status
    const availableListings = data.listings.filter((listing) => 
      listing.quantity > 0 && 
      listing.status === "For Sale"
    )

    // Optimize for performance by limiting release data fetches
    // Only fetch for first page or explicitly requested
    const shouldFetchFullData = options.fetchFullReleaseData || 
                               (page === 1 && availableListings.length <= 50);
                               
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

    // No caching for record data

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

