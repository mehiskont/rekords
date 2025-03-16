export interface DiscogsRecord {
  // The id needs to be within PostgreSQL INT4 range (-2147483648 to 2147483647)
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
  format_quantity?: number
  weight?: number
  weight_unit?: string
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
  cacheBuster?: string  // Used to bypass cache for fresh data
}

