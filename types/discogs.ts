export interface DiscogsRecord {
  id: number
  title: string
  artist: string
  price: number
  cover_image: string
  condition: string
  status: string
  label: string
  catalogNumber: string // Added this field
  release: string
  styles?: string[]
  format: string[]
  country?: string
  released?: string
  date_added: string
  genres: string[]
}

