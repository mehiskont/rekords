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
  styles: string[]
  format: string[]
  country?: string
  released?: string
  date_added: string
}

function inferStyles(record: any): string[] {
  const inferredStyles: string[] = []

  // Infer styles based on genre if available
  if (record.genre) {
    inferredStyles.push(...record.genre)
  }

  // Parse format string into components
  const formatStr = Array.isArray(record.format)
    ? record.format.join(" ")
    : typeof record.format === "string"
      ? record.format
      : ""
  const formatParts = formatStr.split(",").map((p) => p.trim().toLowerCase())

  // Map format parts to styles
  if (formatParts.includes("ep")) inferredStyles.push("EP")
  if (formatParts.includes("lp")) inferredStyles.push("LP")
  if (formatParts.includes("album")) inferredStyles.push("Album")
  if (formatParts.includes("single")) inferredStyles.push("Single")
  if (formatParts.includes("maxi")) inferredStyles.push("Maxi-Single")

  // Infer styles based on title or artist
  const titleLower = record.title.toLowerCase()
  const artistLower = record.artist.toLowerCase()

  if (titleLower.includes("remix") || artistLower.includes("remix")) inferredStyles.push("Remix")
  if (titleLower.includes("live") || artistLower.includes("live")) inferredStyles.push("Live")
  if (titleLower.includes("acoustic") || artistLower.includes("acoustic")) inferredStyles.push("Acoustic")

  // Infer electronic music styles
  if (titleLower.includes("techno") || artistLower.includes("techno")) inferredStyles.push("Techno")
  if (titleLower.includes("house") || artistLower.includes("house")) inferredStyles.push("House")
  if (titleLower.includes("trance") || artistLower.includes("trance")) inferredStyles.push("Trance")
  if (
    titleLower.includes("drum and bass") ||
    artistLower.includes("drum and bass") ||
    titleLower.includes("dnb") ||
    artistLower.includes("dnb")
  )
    inferredStyles.push("Drum and Bass")

  // Infer other music genres
  if (titleLower.includes("rock") || artistLower.includes("rock")) inferredStyles.push("Rock")
  if (titleLower.includes("jazz") || artistLower.includes("jazz")) inferredStyles.push("Jazz")
  if (
    titleLower.includes("hip hop") ||
    artistLower.includes("hip hop") ||
    titleLower.includes("rap") ||
    artistLower.includes("rap")
  )
    inferredStyles.push("Hip Hop")

  // Add a default style if none were inferred
  if (inferredStyles.length === 0) {
    if (formatStr.toLowerCase().includes('12"')) {
      inferredStyles.push('12"')
    }
  }

  return [...new Set(inferredStyles)] // Remove duplicates
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
            styles:
              listing.release.style && listing.release.style.length > 0
                ? listing.release.style
                : inferStyles(listing.release),
            format: Array.isArray(listing.release.format) ? listing.release.format : [listing.release.format],
            country: listing.release.country,
            released: listing.release.released,
            date_added: listing.posted || new Date().toISOString(),
          }

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
      styles: data.release.style && data.release.style.length > 0 ? data.release.style : inferStyles(data.release),
      format: Array.isArray(data.release.format) ? data.release.format : [data.release.format],
      country: data.release.country,
      released: data.release.released,
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

