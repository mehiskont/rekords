import type { ClassValue } from "clsx"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

// Update the serializeForClient function to include weight information
export function serializeForClient<T extends Record<string, any>>(obj: T): T {
  const cleanObj = {
    id: obj.id,
    title: obj.title,
    artist: obj.artist,
    price: obj.price,
    shipping_price: obj.shipping_price,
    cover_image: obj.cover_image,
    condition: obj.condition,
    status: obj.status,
    label: obj.label,
    catalogNumber: obj.catalogNumber,
    release: obj.release,
    styles: obj.styles,
    format: obj.format,
    country: obj.country,
    released: obj.released,
    date_added: obj.date_added,
    genres: obj.genres,
    quantity_available: obj.quantity_available,
    weight: obj.weight,
    weight_unit: obj.weight_unit,
  }

  return JSON.parse(JSON.stringify(cleanObj))
}

interface RetryOptions {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit & { retryOptions?: RetryOptions } = {},
): Promise<Response> {
  const { retryOptions, ...fetchOptions } = options
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000 } = retryOptions || {}

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions)

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After")
        const delay = retryAfter
          ? Number.parseInt(retryAfter) * 1000
          : Math.min(Math.pow(2, attempt) * baseDelay, maxDelay)
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return response
    } catch (error) {
      lastError = error as Error

      if (attempt === maxRetries) {
        throw new Error(`Failed to fetch ${url} after ${maxRetries} retries`)
      }

      const delay = Math.min(Math.pow(2, attempt) * baseDelay + Math.random() * 1000, maxDelay)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

export class BatchProcessor<T, R> {
  private batch: Array<{
    item: T
    resolve: (value: R) => void
    reject: (error: any) => void
  }> = []
  private processing = false
  private timer: NodeJS.Timeout | null = null

  constructor(
    private readonly processFn: (items: T[]) => Promise<R[]>,
    private readonly options: {
      maxBatchSize?: number
      maxWaitTime?: number
    } = {},
  ) {}

  async add(item: T): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      this.batch.push({ item, resolve, reject })

      if (this.batch.length >= (this.options.maxBatchSize || 10)) {
        this.process()
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.process(), this.options.maxWaitTime || 1000)
      }
    })
  }

  private async process(): Promise<void> {
    if (this.processing || this.batch.length === 0) return

    this.processing = true
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    const currentBatch = [...this.batch]
    this.batch = []

    try {
      const items = currentBatch.map(({ item }) => item)
      const results = await this.processFn(items)
      results.forEach((result, index) => {
        currentBatch[index].resolve(result)
      })
    } catch (error) {
      currentBatch.forEach(({ reject }) => {
        reject(error)
      })
    } finally {
      this.processing = false
      if (this.batch.length > 0) {
        this.process()
      }
    }
  }
}

