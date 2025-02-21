import { getCachedData, setCachedData } from "./redis"
import type { DiscogsRecord } from "@/types/discogs"
import { fetchWithRetry } from "@/lib/utils"

const CACHE_TTL = 3600 // 1 hour

export async function getDiscogsInventory(
  search?: string,
  sort?: string,
  page = 1,
  perPage = 50,
): Promise<{ records: DiscogsRecord[]; totalPages: number }> {
  const cacheKey = `inventory:${search || "all"}:${sort || "default"}:${page}:${perPage}`

  try {
    const cachedData = await getCachedData(cacheKey)
    if (cachedData) {
      return JSON.parse(cachedData)
    }
  } catch (error) {
    console.error("Cache read error:", error)
    // Continue without cache
  }

  try {
    const response = await fetchWithRetry(
      `https://api.discogs.com/users/${process.env.DISCOGS_USERNAME}/inventory?token=${process.env.DISCOGS_API_TOKEN}&page=${page}&per_page=${perPage}`,
      {
        headers: {
          Authorization: `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
          "User-Agent": "YourAppName/1.0",
        },
      },
    )

    const data = await response.json()

    if (!data || !data.listings) {
      console.error("Invalid data structure received from Discogs API:", data)
      return { records: [], totalPages: 0 }
    }

    const releaseIds = data.listings.map((listing: any) => listing.release.id)
    const uniqueReleaseIds = [...new Set(releaseIds)]

    const fullReleases = await Promise.all(uniqueReleaseIds.map((id) => fetchFullReleaseData(id.toString())))

    const releaseMap = new Map(fullReleases.map((release) => [release.id, release]))

    const records = data.listings.map((listing: any) => {
      const fullRelease = releaseMap.get(listing.release.id)
      return mapReleaseToRecord(listing, fullRelease)
    })

    const result = {
      records,
      totalPages: Math.ceil(data.pagination.items / perPage),
    }

    // Cache the result
    try {
      await setCachedData(cacheKey, JSON.stringify(result), CACHE_TTL)
    } catch (error) {
      console.error("Cache write error:", error)
      // Continue without cache
    }

    return result
  } catch (error) {
    console.error("Error fetching inventory:", error)
    return { records: [], totalPages: 0 }
  }
}

export function mapReleaseToRecord(data: any, fullRelease: any): DiscogsRecord {
  return {
    id: data.id,
    title: data.release.title,
    artist: data.release.artist,
    price: data.price.value,
    cover_image: fullRelease?.images?.[0]?.resource_url || "/placeholder.svg",
    condition: data.condition,
    status: data.status,
    label: data.release.label,
    catalogNumber: fullRelease?.labels?.[0]?.catno || "",
    release: data.release.id.toString(),
    styles: fullRelease?.styles || [],
    format: Array.isArray(data.release.format) ? data.release.format : [data.release.format],
    country: fullRelease?.country || "",
    released: fullRelease?.released_formatted || fullRelease?.released || "",
    date_added: data.posted,
    genres: fullRelease?.genres || [],
    quantity_available: data.quantity || 1, // Ensure we get the quantity from Discogs listing
  }
}

export async function getDiscogsRecord(
  id: string,
): Promise<{ record: DiscogsRecord | null; relatedRecords: DiscogsRecord[] }> {
  const cacheKey = `record:${id}`

  try {
    const cachedData = await getCachedData(cacheKey)
    if (cachedData) {
      return JSON.parse(cachedData)
    }
  } catch (error) {
    console.error("Cache read error:", error)
    // Continue without cache
  }

  try {
    const response = await fetchWithRetry(
      `https://api.discogs.com/marketplace/listings/${id}?token=${process.env.DISCOGS_API_TOKEN}`,
      {
        headers: {
          Authorization: `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
          "User-Agent": "YourAppName/1.0",
        },
      },
    )

    const data = await response.json()
    const fullRelease = await fetchFullReleaseData(data.release.id.toString())
    const record = mapReleaseToRecord(data, fullRelease)

    // Fetch related records
    const { records: allRelatedRecords } = await getDiscogsInventory(undefined, undefined, 1, 4)

    // Filter out the current record from related records
    const relatedRecords = allRelatedRecords.filter(
      (relatedRecord) => relatedRecord.id !== record.id && relatedRecord.release !== record.release,
    )

    const result = { record, relatedRecords }

    // Cache the result
    try {
      await setCachedData(cacheKey, JSON.stringify(result), CACHE_TTL)
    } catch (error) {
      console.error("Cache write error:", error)
      // Continue without cache
    }

    return result
  } catch (error) {
    console.error("Error fetching record:", error)
    return { record: null, relatedRecords: [] }
  }
}

async function fetchFullReleaseData(releaseId: string): Promise<any> {
  const cacheKey = `release:${releaseId}`

  try {
    const cachedData = await getCachedData(cacheKey)
    if (cachedData) {
      return JSON.parse(cachedData)
    }
  } catch (error) {
    console.error("Cache read error:", error)
    // Continue without cache
  }

  const response = await fetchWithRetry(`https://api.discogs.com/releases/${releaseId}`, {
    headers: {
      Authorization: `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
      "User-Agent": "YourAppName/1.0",
    },
  })
  const data = await response.json()

  // Cache the result
  try {
    await setCachedData(cacheKey, JSON.stringify(data), CACHE_TTL)
  } catch (error) {
    console.error("Cache write error:", error)
    // Continue without cache
  }

  return data
}

