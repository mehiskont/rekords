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

    if (!data || !data.listings) {
      console.error("Invalid data structure received from Discogs API:", data)
      return { records: [], totalPages: 0 }
    }

    let records = data.listings
      .map((listing: any) => {
        try {
          console.log("Full release data:", JSON.stringify(listing.release, null, 2))
          const record = {
            id: listing.id,
            title: listing.release.title || "Untitled",
            artist: Array.isArray(listing.release.artist)
              ? listing.release.artist.join(", ")
              : listing.release.artist || "Unknown Artist",
            price: Number.parseFloat(listing.price.value) || 0,
            cover_image: listing.release.images?.[0]?.uri ?? listing.release.thumb ?? "/placeholder.svg",
            condition: listing.condition || "Unknown",
            status: listing.status || "Unknown",
            label: Array.isArray(listing.release.label)
              ? listing.release.label[0]
              : listing.release.label || "Unknown Label",
            release: listing.release.catalog_number || "",
            genres: (listing.release.genre || [])
              .concat(listing.release.styles || [])
              .concat(listing.release.genres || [])
              .concat(listing.genre || [])
              .concat(listing.styles || [])
              .filter((genre, index, self) => genre && self.indexOf(genre) === index),
            date_added: listing.posted || new Date().toISOString(),
          }

          console.log("Genres:", record.genres)
          console.log("Release object:", listing.release)
          console.log("Mapped record:", record)
          return record
        } catch (error) {
          console.error("Error mapping record:", error, listing)
          return null
        }
      })
      .filter(Boolean) as DiscogsRecord[]

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

    // Calculate pagination
    const startIndex = (page - 1) * perPage
    const paginatedRecords = records.slice(startIndex, startIndex + perPage)
    const totalPages = Math.ceil(records.length / perPage)

    return {
      records: paginatedRecords,
      totalPages,
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
      genres: data.release.genre || [],
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

