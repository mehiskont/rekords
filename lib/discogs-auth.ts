import OAuth from "oauth-1.0a"
import crypto from "crypto"

const DISCOGS_API_URL = "https://api.discogs.com"
const DISCOGS_AUTH_URL = "https://www.discogs.com/oauth"

// Add debug logging
const debug = (...args: any[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log("[Discogs Auth]", ...args)
  }
}

const oauth = new OAuth({
  consumer: {
    key: process.env.DISCOGS_CONSUMER_KEY!,
    secret: process.env.DISCOGS_CONSUMER_SECRET!,
  },
  signature_method: "HMAC-SHA1",
  hash_function(base_string, key) {
    return crypto.createHmac("sha1", key).update(base_string).digest("base64")
  },
})

export async function getRequestToken(callbackUrl: string) {
  // Validate credentials
  if (!process.env.DISCOGS_CONSUMER_KEY || !process.env.DISCOGS_CONSUMER_SECRET) {
    throw new Error("Missing Discogs API credentials")
  }

  const requestData = {
    url: `${DISCOGS_AUTH_URL}/request_token`,
    method: "GET",
  }

  debug("Getting request token with callback:", callbackUrl)
  debug("Request data:", requestData)

  const headers = oauth.toHeader(oauth.authorize(requestData))
  debug("Generated headers:", headers)

  try {
    const response = await fetch(requestData.url, {
      headers: {
        ...headers,
        "User-Agent": "PlastikRecordStore/1.0",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      debug("Error response:", response.status, errorText)
      throw new Error(`Failed to get request token: ${response.statusText} (${errorText})`)
    }

    const data = await response.text()
    debug("Response data:", data)

    const params = new URLSearchParams(data)
    const oauth_token = params.get("oauth_token")
    const oauth_token_secret = params.get("oauth_token_secret")

    if (!oauth_token || !oauth_token_secret) {
      throw new Error("Invalid response from Discogs")
    }

    return {
      oauth_token,
      oauth_token_secret,
    }
  } catch (error) {
    debug("Error getting request token:", error)
    throw error
  }
}

// ... rest of the file remains the same

