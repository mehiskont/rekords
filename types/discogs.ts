export interface TrackVideo {
  title: string
  url: string
  duration?: string
  embed?: boolean
}

export interface DiscogsTrack {
  position: string
  title: string
  duration?: string
  video?: TrackVideo
}

export interface DiscogsRecord {
  // The id can be any integer, will be stored as BigInt in the database
  id: number | string | bigint  // Allow different input formats
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
  tracks?: DiscogsTrack[]
  videos?: TrackVideo[]
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

