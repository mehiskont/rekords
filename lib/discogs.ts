import { getCachedData, setCachedData } from "./redis"
import type { DiscogsRecord } from "@/types/discogs"
import { fetchWithRetry } from "@/lib/utils"

const CACHE_TTL = 3600 // 1 hour

export async function getDiscogsInventory(
  search?: string,
  sort?: string,
  page = 1,
  perPage = 50,
  options: { category?: string; sort?: string; sort_order?: string } = {},
): Promise<{ records: DiscogsRecord[]; totalPages: number }> {
  const cacheKey = `inventory:${search || "all"}:${sort || "default"}:${page}:${perPage}:${options.category || "all"}:${options.sort || "default"}:${options.sort_order || "default"}`

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
    // Construct the base URL
    const baseUrl = `https://api.discogs.com/users/${process.env.DISCOGS_USERNAME}/inventory`

    // Build query parameters
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
      status: "For Sale",
    })

    // Use the provided sort and sort_order if available, otherwise use the sort parameter
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
    } else if (sort === "date_desc" || sort === "price_desc" || sort === "title_desc") {
      params.append("sort_order", "desc")
    }

    if (search) {
      params.append("q", search)
    }

    const url = `${baseUrl}?${params.toString()}`

    console.log("Fetching from Discogs API:", url.replace(process.env.DISCOGS_API_TOKEN || "", "[REDACTED]"))

    const response = await fetchWithRetry(url, {
      headers: {
        Authorization: `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
        "User-Agent": "PlastikRecordStore/1.0 +http://plastikrecords.com",
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error("Discogs API error response:", {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
      })

      // Return empty results instead of throwing
      return { records: [], totalPages: 0 }
    }

    const data = await response.json()
    console.log("Raw Discogs API response:", JSON.stringify(data, null, 2))

    if (!data || !data.listings) {
      console.error("Invalid data structure received from Discogs API:", data)
      return { records: [], totalPages: 0 }
    }

    // Filter out listings with quantity 0
    const availableListings = data.listings.filter((listing: any) => listing.quantity > 0)

    const records = availableListings.map((listing: any) => mapListingToRecord(listing))

    // Apply category filtering if specified
    let filteredRecords = records
    if (options.category && options.category !== "everything") {
      filteredRecords = filterRecordsByCategory(records, search || "", options.category)
    }

    const result = {
      records: filteredRecords,
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
    // Return empty results instead of throwing
    return { records: [], totalPages: 0 }
  }
}

function mapListingToRecord(listing: any): DiscogsRecord {
  return {
    id: listing.id,
    title: listing.release.title,
    artist: listing.release.artist,
    price: listing.price.value,
    cover_image: listing.release.images?.[0]?.uri || "/placeholder.svg",
    condition: listing.condition,
    status: listing.status,
    label: listing.release.label,
    catalogNumber: listing.release.catno || "",
    release: listing.release.id.toString(),
    styles: listing.release.styles || [],
    format: Array.isArray(listing.release.format) ? listing.release.format : [listing.release.format],
    country: listing.release.country || "",
    released: listing.release.year || "",
    date_added: listing.posted,
    genres: listing.release.genres || [],
    quantity_available: listing.quantity || 1,
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
          "User-Agent": "PlastikRecordStore/1.0 +http://plastikrecords.com",
        },
      },
    )

    const data = await response.json()

    // Check if the listing is still available for sale
    if (data.status !== "For Sale" || data.quantity === 0) {
      return { record: null, relatedRecords: [] }
    }

    const fullRelease = await fetchFullReleaseData(data.release.id.toString())
    const record = await mapReleaseToRecord(data, fullRelease)

    // Fetch related records that are in stock
    const { records: allRelatedRecords } = await getDiscogsInventory(undefined, undefined, 1, 4)

    // Filter out the current record and ensure all related records are in stock
    const relatedRecords = allRelatedRecords.filter(
      (relatedRecord) =>
        relatedRecord.id !== record.id &&
        relatedRecord.release !== record.release &&
        relatedRecord.quantity_available > 0,
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
      "User-Agent": "PlastikRecordStore/1.0 +http://plastikrecords.com",
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

async function mapReleaseToRecord(listing: any, fullRelease: any): Promise<DiscogsRecord> {
  return {
    id: listing.id,
    title: fullRelease.title,
    artist: fullRelease.artists[0].name,
    price: listing.price.value,
    cover_image: fullRelease.images?.[0]?.resource_url || "/placeholder.svg",
    condition: listing.condition,
    status: listing.status,
    label: fullRelease.labels.map((label: any) => label.name).join(", "),
    catalogNumber: fullRelease.labels.map((label: any) => label.catno).join(", "),
    release: fullRelease.id.toString(),
    styles: fullRelease.styles || [],
    format: fullRelease.formats.map((format: any) => format.name),
    country: fullRelease.country || "",
    released: fullRelease.year || "",
    date_added: listing.posted,
    genres: fullRelease.genres || [],
    quantity_available: listing.quantity || 1,
  }
}

