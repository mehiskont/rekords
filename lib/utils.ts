import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { DiscogsRecord } from "@/types/discogs"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date))
}

const API_RATE_LIMIT = 60 // Requests per minute
const API_RATE_WINDOW = 60000 // 1 minute in milliseconds
let requestCount = 0
let windowStart = Date.now()

export async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      // Check rate limit
      const now = Date.now()
      if (now - windowStart > API_RATE_WINDOW) {
        requestCount = 0
        windowStart = now
      }

      if (requestCount >= API_RATE_LIMIT) {
        const delay = API_RATE_WINDOW - (now - windowStart)
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      requestCount++
      const response = await fetch(url, options)
      if (response.ok) return response
      if (response.status === 429) {
        console.warn("Rate limit exceeded, retrying after delay")
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, i)))
        continue
      }
      throw new Error(`HTTP error! status: ${response.status}`)
    } catch (error) {
      if (i === retries - 1) throw error
      console.warn(`Attempt ${i + 1} failed, retrying...`)
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, i)))
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries`)
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
  }
}

