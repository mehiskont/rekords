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
}

export async function getDiscogsInventory(
  search?: string,
  sort?: string,
  page = 1,
  perPage = 20,
  searchParams?: { category?: string },
): Promise<{ records: DiscogsRecord[]; totalPages: number }> {
  try {
    const response = await fetch(
      `https://api.discogs.com/users/${process.env.DISCOGS_USERNAME}/inventory?token=${process.env.DISCOGS_API_TOKEN}`,
      {
        headers: {
          Authorization: `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
          "User-Agent": "YourAppName/1.0",
        },
        next: { revalidate: 60 },
      },
    )

    if (!response.ok) {
      throw new Error("Failed to fetch inventory")
    }

    const data = await response.json()

    console.log("Full API response:", JSON.stringify(data, null, 2))

    if (!data || !data.listings) {
      console.error("Invalid data structure received from Discogs API:", data)
      return { records: [], totalPages: 0 }
    }

    const getFullReleaseData = async (listing: any) => {
      try {
        const response = await fetch(listing.release.resource_url, {
          headers: {
            Authorization: `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
            "User-Agent": "YourAppName/1.0",
          },
        })
        const fullRelease = await response.json()
        console.log("Full release data:", JSON.stringify(fullRelease, null, 2))
        return fullRelease
      } catch (error) {
        console.error("Error fetching full release data:", error)
        return listing.release
      }
    }

    let records = await Promise.all(
      data.listings.map(async (listing: any) => {
        try {
          const fullRelease = await getFullReleaseData(listing)
          const record = {
            id: listing.id,
            title: fullRelease.title || "Untitled",
            artist: Array.isArray(fullRelease.artists)
              ? fullRelease.artists.map((a: any) => a.name).join(", ")
              : fullRelease.artist || "Unknown Artist",
            price: Number.parseFloat(listing.price.value) || 0,
            cover_image: fullRelease.images?.[0]?.uri ?? fullRelease.thumb ?? "/placeholder.svg",
            condition: listing.condition || "Unknown",
            status: listing.status || "Unknown",
            label: Array.isArray(fullRelease.labels)
              ? fullRelease.labels[0].name
              : fullRelease.label || "Unknown Label",
            release: fullRelease.catalog_number || "",
            genres: fullRelease.genres || [],
            styles: fullRelease.styles || [],
            format: Array.isArray(fullRelease.formats)
              ? fullRelease.formats.map((f: any) => f.name)
              : [fullRelease.format],
            country: fullRelease.country,
            released: fullRelease.released_formatted || fullRelease.released,
            date_added: listing.posted || new Date().toISOString(),
          }
          console.log("Mapped record:", record)
          return record
        } catch (error) {
          console.error("Error mapping record:", error, listing)
          return null
        }
      }),
    )

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
      records: records.slice((page - 1) * perPage, page * perPage),
      totalPages: Math.ceil(records.length / perPage),
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
    const response = await fetch(
      `https://api.discogs.com/marketplace/listings/${id}?token=${process.env.DISCOGS_API_TOKEN}`,
      {
        headers: {
          Authorization: `Discogs token=${process.env.DISCOGS_API_TOKEN}`,
          "User-Agent": "YourAppName/1.0",
        },
        next: { revalidate: 60 },
      },
    )

    if (!response.ok) {
      throw new Error("Failed to fetch record")
    }

    const data = await response.json()

    console.log("Full API response:", JSON.stringify(data, null, 2))

    const record: DiscogsRecord = {
      id: data.id,
      title: data.release.title || "Untitled",
      artist: Array.isArray(data.release.artist)
        ? data.release.artist.join(", ")
        : data.release.artist || "Unknown Artist",
      price: Number.parseFloat(data.price.value) || 0,
      cover_image: data.release.images?.[0]?.uri ?? data.release.thumb ?? "/placeholder.svg",
      condition: data.condition || "Unknown",
      status: data.status || "Unknown",
      label: Array.isArray(data.release.label) ? data.release.label[0] : data.release.label || "Unknown Label",
      release: data.release.catalog_number || "",
      genres: Array.isArray(data.release.genre) ? data.release.genre : [],
      styles: Array.isArray(data.release.style) ? data.release.style : [],
      format: Array.isArray(data.release.format) ? data.release.format : [data.release.format],
      country: data.release.country,
      released: data.release.released_formatted || data.release.released,
      date_added: data.posted || new Date().toISOString(),
    }

    // Fetch related records (you may need to adjust this based on your requirements)
    const { records: relatedRecords } = await getDiscogsInventory(undefined, undefined, 1, 3)

    return { record, relatedRecords }
  } catch (error) {
    console.error("Error fetching record:", error)
    return { record: null, relatedRecords: [] }
  }
}

