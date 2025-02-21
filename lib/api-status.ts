import { fetchWithRetry } from "@/lib/utils"

export async function checkDiscogsApiStatus(): Promise<boolean> {
  try {
    const response = await fetchWithRetry(
      `https://api.discogs.com/database/search?q=test&token=${process.env.DISCOGS_API_TOKEN}`,
      {
        headers: {
          "User-Agent": "YourAppName/1.0",
        },
      },
    )
    return response.ok
  } catch (error) {
    console.error("Error checking Discogs API status:", error)
    return false
  }
}