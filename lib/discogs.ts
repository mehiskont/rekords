import type { DiscogsRecord } from "@/types/discogs"

export async function getDiscogsInventory(
  search?: string,
  sort?: string,
  page = 1,
  perPage = 20,
): Promise<{ records: DiscogsRecord[]; totalPages: number }> {
  const params = new URLSearchParams({
    token: process.env.DISCOGS_API_TOKEN!,
    page: page.toString(),
    per_page: perPage.toString(),
  })

  if (search) {
    params.append("q", search)
  }

  const response = await fetch(
    `https://api.discogs.com/users/${process.env.DISCOGS_USERNAME}/inventory?${params.toString()}`,
    {
      headers: {
        "User-Agent": "YourAppName/1.0",
      },
      next: { revalidate: 60 }, // Cache for 1 minute
    },
  )

  if (!response.ok) {
    throw new Error("Failed to fetch inventory")
  }

  const data = await response.json()
  let records = data.listings.map((listing: any) => ({
    id: listing.id,
    title: listing.release.title,
    artist: listing.release.artist,
    price: Number.parseFloat(listing.price.value),
    cover_image: listing.release.thumb,
    condition: listing.condition,
    status: listing.status,
  }))

  // Client-side sorting
  if (sort) {
    records = records.sort((a: DiscogsRecord, b: DiscogsRecord) => {
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
}

export async function removeFromDiscogsInventory(listingId: string) {
  const response = await fetch(`https://api.discogs.com/marketplace/listings/${listingId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
      "User-Agent": "YourAppName/1.0",
    },
  })

  if (!response.ok) {
    throw new Error("Failed to remove item from Discogs inventory")
  }

  return response.json()
}

export async function getDiscogsRecord(
  id: string,
): Promise<{ record: DiscogsRecord | null; relatedRecords: DiscogsRecord[] }> {
  const response = await fetch(`https://api.discogs.com/marketplace/listings/${id}`, {
    headers: {
      Authorization: `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
      "User-Agent": "YourAppName/1.0",
    },
    next: { revalidate: 60 }, // Cache for 1 minute
  })

  if (!response.ok) {
    if (response.status === 404) {
      return { record: null, relatedRecords: [] }
    }
    throw new Error("Failed to fetch record")
  }

  const data = await response.json()
  const record = {
    id: data.id,
    title: data.release.title,
    artist: data.release.artist,
    price: Number.parseFloat(data.price.value),
    cover_image: data.release.images[0]?.uri || null,
    condition: data.condition,
    status: data.status,
  }

  // Fetch related records (e.g., by the same artist)
  const relatedResponse = await fetch(
    `https://api.discogs.com/database/search?artist=${encodeURIComponent(record.artist)}&type=release&per_page=4`,
    {
      headers: {
        Authorization: `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
        "User-Agent": "YourAppName/1.0",
      },
      next: { revalidate: 60 }, // Cache for 1 minute
    },
  )

  if (!relatedResponse.ok) {
    throw new Error("Failed to fetch related records")
  }

  const relatedData = await relatedResponse.json()
  const relatedRecords = relatedData.results
    .filter((item: any) => item.id.toString() !== id)
    .slice(0, 3)
    .map((item: any) => ({
      id: item.id,
      title: item.title,
      artist: item.artist,
      price: item.community.have, // Using 'have' count as a placeholder for price
      cover_image: item.cover_image,
      condition: "N/A",
      status: "N/A",
    }))

  return { record, relatedRecords }
}

