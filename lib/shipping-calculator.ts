import countryList from "react-select-country-list"
/**
 * Shipping calculator utility functions
 * Used to calculate shipping costs based on weight and destination
 */

// Define shipping rate tiers based on weight (in grams) and destination
const SHIPPING_RATES = {
  ESTONIA: {
    ITELLA_SMARTPOST: 2.99,
    LOCAL_PICKUP: 0,
  },
  EUROPE: [
    { maxWeight: 2000, cost: 15.0 },
    { maxWeight: 3000, cost: 18.0 },
    { maxWeight: 5000, cost: 24.0 },
    { maxWeight: Number.POSITIVE_INFINITY, cost: 29.0 },
  ],
  REST_OF_WORLD: [
    { maxWeight: 3000, cost: 25.0 },
    { maxWeight: 5000, cost: 30.0 },
    { maxWeight: Number.POSITIVE_INFINITY, cost: 55.0 },
  ],
}

// List of European country codes (you may need to expand this list)
const EUROPEAN_COUNTRIES = countryList()
  .getData()
  .filter((country) =>
    [
      "Austria",
      "Belgium",
      "Bulgaria",
      "Croatia",
      "Cyprus",
      "Czech Republic",
      "Denmark",
      "Finland",
      "France",
      "Germany",
      "Greece",
      "Hungary",
      "Ireland",
      "Italy",
      "Latvia",
      "Lithuania",
      "Luxembourg",
      "Malta",
      "Netherlands",
      "Poland",
      "Portugal",
      "Romania",
      "Slovakia",
      "Slovenia",
      "Spain",
      "Sweden",
    ].includes(country.label),
  )
  .map((country) => country.label)

/**
 * Calculate shipping cost based on total weight and destination country
 *
 * @param totalWeight - Total weight in grams
 * @param destinationCountry - Country code
 * @param shippingMethod - Shipping method (for Estonia)
 * @returns Calculated shipping cost
 */
export function calculateShippingCost(
  totalWeight: number,
  destinationCountry: string,
  shippingMethod: "ITELLA_SMARTPOST" | "LOCAL_PICKUP" = "ITELLA_SMARTPOST",
): number {
  // Handle Estonia separately
  if (destinationCountry.toLowerCase() === "estonia") {
    return SHIPPING_RATES.ESTONIA[shippingMethod]
  }

  // Determine if the destination is in Europe
  const isEurope = EUROPEAN_COUNTRIES.includes(destinationCountry)
  const rates = isEurope ? SHIPPING_RATES.EUROPE : SHIPPING_RATES.REST_OF_WORLD

  // Find the appropriate shipping rate based on weight
  for (const rate of rates) {
    if (totalWeight <= rate.maxWeight) {
      return rate.cost
    }
  }

  // If we've reached here, use the highest rate (should never happen due to Infinity maxWeight)
  return rates[rates.length - 1].cost
}

/**
 * Calculate total weight for a collection of items
 *
 * @param items - Array of items with weight and quantity properties
 * @returns Total weight in grams
 */
export function calculateTotalWeight(items: Array<{ weight?: number; quantity: number }>): number {
  return items.reduce((total, item) => {
    // Default to 180g per record if weight is not specified
    const itemWeight = item.weight || 180
    return total + itemWeight * item.quantity
  }, 0)
}

// Example usage:
// const items = [
//   { weight: 200, quantity: 2 },
//   { weight: 180, quantity: 1 }
// ];
// const totalWeight = calculateTotalWeight(items);
// const shippingCost = calculateShippingCost(totalWeight, 'France'); // For a shipment to France
// console.log(`Shipping cost: €${shippingCost.toFixed(2)}`);

