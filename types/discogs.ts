export interface DiscogsRecord {
  id: number
  title: string
  artist: string
  price: number
  shipping_price?: number
  cover_image: string
  condition: string
  status: string
  label: string
  catalogNumber: string
  release: string
  styles?: string[]
  format: string[]
  country?: string
  released?: string
  date_added: string
  genres: string[]
  quantity_available: number
}

export interface DiscogsApiResponse {
  pagination: {
    page: number
    pages: number
    per_page: number
    items: number
    urls: {
      last?: string
      next?: string
    }
  }
  listings: any[]
}

export interface DiscogsInventoryOptions {
  category?: string
  sort?: string
  sort_order?: string
  fetchFullReleaseData?: boolean
}

