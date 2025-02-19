import type { DiscogsRecord } from "./discogs"

export interface CartItem extends DiscogsRecord {
  quantity: number
}

