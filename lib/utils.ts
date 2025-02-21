import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

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

      // Add default headers if not present
      const headers = new Headers(options.headers)
      if (!headers.has("User-Agent")) {
        headers.set("User-Agent", "PlastikRecordStore/1.0")
      }
      if (!headers.has("Accept")) {
        headers.set("Accept", "application/json")
      }

      const response = await fetch(url, {
        ...options,
        headers,
      })

      // Log detailed error information for non-200 responses
      if (!response.ok) {
        const errorBody = await response.text()
        console.error("API Error:", {
          url: url.replace(process.env.DISCOGS_API_TOKEN || "", "[REDACTED]"),
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorBody,
        })

        // For specific error codes, handle differently
        if (response.status === 429) {
          console.warn("Rate limit exceeded, retrying after delay")
          await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, i)))
          continue
        }

        // For authentication errors, log and break
        if (response.status === 401 || response.status === 403) {
          console.error(`Authentication error: ${response.status}. Please check your Discogs API token.`)
          break
        }

        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return response
    } catch (error) {
      if (i === retries - 1) throw error
      console.warn(`Attempt ${i + 1} failed, retrying...`, error)
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, i)))
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries`)
}

