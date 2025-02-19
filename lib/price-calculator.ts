// Discogs takes an 8% fee on sales
const DISCOGS_FEE_PERCENTAGE = 0.08

export function calculatePriceWithoutFees(originalPrice: number): number {
  return originalPrice * (1 - DISCOGS_FEE_PERCENTAGE)
}

