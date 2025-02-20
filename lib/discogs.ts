import type { DiscogsRecord } from "@/types"
import { fetchWithRetry } from "@/lib/utils"

async function fetchFullReleaseData(releaseId: string) {
  try {
    const response = await fetchWithRetry(
      `https://api.discogs.com/releases/${releaseId}?token=${process.env.DISCOGS_API_TOKEN}`,
      {
        headers: {
          Authorization: `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
          "User-Agent": "YourAppName/1.0",
        },
      },
    )
    return await response.json()
  } catch (error) {
    console.error("Error fetching full release data:", error)
    return null
  }
}

function mapReleaseToRecord(data: any, fullRelease: any): DiscogsRecord {
  return {
    id: data.id,
    title: data.release.title,
    artist: data.release.artist,
    label: data.release.label,
    format: data.release.format,
    price: data.price.value,
    currency: data.price.currency,
    condition: data.condition,
    comments: data.comments,
    release: data.release.id,
    year: fullRelease?.year || null,
    imageUrl: fullRelease?.images?.[0]?.resource_url || null,
  }
}

export async function getDiscogsInventory(
  search?: string,
  sort?: string,
  page = 1,
  perPage = 50,
  minPrice?: number,
  maxPrice?: number,
): Promise<{ records: DiscogsRecord[]; pagination: any }> {
  try {
    let url = `https://api.discogs.com/users/${process.env.DISCOGS_USERNAME}/inventory?token=${process.env.DISCOGS_API_TOKEN}&page=${page}&per_page=${perPage}`

    if (search) {
      url += `&q=${encodeURIComponent(search)}`
    }
    if (sort) {
      url += `&sort=${sort}`
    }
    if (minPrice !== undefined) {
      url += `&price_min=${minPrice}`
    }
    if (maxPrice !== undefined) {
      url += `&price_max=${maxPrice}`
    }

    const response = await fetchWithRetry(url, {
      headers: {
        Authorization: `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
        "User-Agent": "YourAppName/1.0",
      },
    })

    const data = await response.json()

    const records: DiscogsRecord[] = data.listings.map((listing: any) => {
      return mapReleaseToRecord(listing, listing.release)
    })

    return { records, pagination: data.pagination }
  } catch (error) {
    console.error("Error fetching Discogs inventory:", error)
    return { records: [], pagination: null }
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
    const { records: allRelatedRecords } = await getDiscogsInventory(undefined, undefined, 1, 4)

    // Filter out the current record from related records
    const relatedRecords = allRelatedRecords.filter(
      (relatedRecord) => relatedRecord.id !== record.id && relatedRecord.release !== record.release,
    )

    return { record, relatedRecords }
  } catch (error) {
    console.error("Error fetching record:", error)
    return { record: null, relatedRecords: [] }
  }
}

export { fetchFullReleaseData, mapReleaseToRecord }

