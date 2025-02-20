import { LRUCache } from "lru-cache"

export interface DiscogsRecord {
  id: number
  title: string
  artist: string
  price: number
  cover_image: string
  condition: string
  status: string
  label: string
  release: string
  genres: string[]
  styles: string[]
  format: string[]
  country?: string
  released?: string
  date_added: string
  catalogNumber?: string
}

const releaseCache = new LRUCache<string, any>({ max: 100 })

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options)
      if (response.ok) return response
    } catch (error) {
      if (i === retries - 1) throw error
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, i)))
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries`)
}

async function fetchFullReleaseData(releaseId: string): Promise<any> {
  const cachedData = releaseCache.get(releaseId)
  if (cachedData) return cachedData

  const response = await fetchWithRetry(`https://api.discogs.com/releases/${releaseId}`, {
    headers: {
      Authorization: `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
      "User-Agent": "YourAppName/1.0",
    },
  })
  const data = await response.json()
  releaseCache.set(releaseId, data)
  return data
}

function extractCatalogNumber(fullRelease: any): string {
  // First try to get it from the labels array
  if (Array.isArray(fullRelease.labels) && fullRelease.labels.length > 0) {
    const label = fullRelease.labels[0]
    if (label.catno) {
      return label.catno
    }
  }

  // Fallback to catalog_number if available
  return fullRelease.catalog_number || ""
}

function mapReleaseToRecord(listing: any, fullRelease: any): DiscogsRecord {
  // Extract the pure label name and catalog number
  let labelName = ""
  const catalogNumber = extractCatalogNumber(fullRelease)

  if (Array.isArray(fullRelease.labels) && fullRelease.labels.length > 0) {
    labelName = fullRelease.labels[0].name
  } else {
    labelName = fullRelease.label || "Unknown Label"
  }

  return {
    id: listing.id,
    title: fullRelease.title || "Untitled",
    artist: Array.isArray(fullRelease.artists)
      ? fullRelease.artists.map((a: any) => a.name).join(", ")
      : fullRelease.artist || "Unknown Artist",
    price: Number.parseFloat(listing.price.value) || 0,
    cover_image: fullRelease.images?.[0]?.uri ?? fullRelease.thumb ?? "/placeholder.svg",
    condition: listing.condition || "Unknown",
    status: listing.status || "Unknown",
    label: labelName,
    catalogNumber: catalogNumber,
    release: fullRelease.catalog_number || "",
    genres: fullRelease.genres || [],
    styles: fullRelease.styles || [],
    format: Array.isArray(fullRelease.formats)
      ? fullRelease.formats.flatMap((f: any) => [f.name, ...(f.descriptions || [])])
      : [fullRelease.format],
    country: fullRelease.country,
    released: fullRelease.released_formatted || fullRelease.released,
    date_added: listing.posted || new Date().toISOString(),
  }
}

export async function getDiscogsInventory(
  search?: string,
  sort?: string,
  page = 1,
  perPage = 20,
  searchParams?: { category?: string },
): Promise<{ records: DiscogsRecord[]; totalPages: number }> {
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

    let records = data.listings.map((listing: any) => {
      const fullRelease = releaseMap.get(listing.release.id)
      return mapReleaseToRecord(listing, fullRelease)
    })

    // Filter records if search is provided
    if (search) {
      const searchLower = search.toLowerCase()
      records = records.filter((record) => {
        const category = searchParams?.category || "everything"

        // Special handling for "various" search
        if (searchLower === "various") {
          switch (category) {
            case "artists":
              return record.artist.toLowerCase() === "various"
            case "releases":
              return record.title.toLowerCase().includes(searchLower)
            case "labels":
              return record.label.toLowerCase().includes(searchLower)
            default:
              return record.artist.toLowerCase() === "various"
          }
        }

        // Normal search handling
        switch (category) {
          case "artists":
            return record.artist.toLowerCase().includes(searchLower)
          case "releases":
            return record.title.toLowerCase().includes(searchLower)
          case "labels":
            return record.label.toLowerCase().includes(searchLower)
          default:
            return (
              record.title.toLowerCase().includes(searchLower) ||
              record.artist.toLowerCase().includes(searchLower) ||
              record.label.toLowerCase().includes(searchLower)
            )
        }
      })
    }

    // Sort records
    if (sort === "date_desc" || sort === "date_asc") {
      records.sort((a, b) => {
        const dateA = new Date(a.date_added).getTime()
        const dateB = new Date(b.date_added).getTime()
        return sort === "date_desc" ? dateB - dateA : dateA - dateB
      })
    } else if (sort) {
      records.sort((a, b) => {
        switch (sort) {
          case "price_asc":
            return a.price - b.price
          case "price_desc":
            return b.price - a.price
          case "title_asc":
            return a.title.localeCompare(b.title)
          case "title_desc":
            return b.title.localeCompare(a.title)
          default:
            return 0
        }
      })
    }

    return {
      records,
      totalPages: Math.ceil(data.pagination.items / perPage),
    }
  } catch (error) {
    console.error("Error fetching inventory:", error)
    return { records: [], totalPages: 0 }
  }
}

export async function getDiscogsRecord(
  id: string,
): Promise<{ record: DiscogsRecord | null; relatedRecords: DiscogsRecord[] }> {
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
    const { records: relatedRecords } = await getDiscogsInventory(undefined, undefined, 1, 3)

    return { record, relatedRecords }
  } catch (error) {
    console.error("Error fetching record:", error)
    return { record: null, relatedRecords: [] }
  }
}

