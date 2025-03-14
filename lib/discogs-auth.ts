import OAuth from "oauth-1.0a"
import crypto from "crypto"

// Discogs OAuth endpoints
const DISCOGS_REQUEST_TOKEN_URL = "https://api.discogs.com/oauth/request_token"
const DISCOGS_AUTHORIZE_URL = "https://www.discogs.com/oauth/authorize"
const DISCOGS_ACCESS_TOKEN_URL = "https://api.discogs.com/oauth/access_token"
const DISCOGS_IDENTITY_URL = "https://api.discogs.com/oauth/identity"

// Get the correct app URL for User-Agent and other uses
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://plastik.komeh.tech"
const USER_AGENT = `PlastikRecordStore/1.0 +${APP_URL}`

// Debug logging helper
const debug = (...args: any[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log("[Discogs Auth]", ...args)
  }
}

// OAuth 1.0a configuration
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

// Types
interface RequestTokenResponse {
  oauth_token: string
  oauth_token_secret: string
}

interface AccessTokenResponse {
  access_token: string
  access_token_secret: string
}

interface DiscogsIdentity {
  id: number
  username: string
  resource_url: string
  consumer_name: string
}

// Get initial request token
export async function getRequestToken(callbackUrl: string): Promise<RequestTokenResponse> {
  // Validate credentials
  if (!process.env.DISCOGS_CONSUMER_KEY || !process.env.DISCOGS_CONSUMER_SECRET) {
    throw new Error("Missing Discogs API credentials")
  }

  const requestData = {
    url: DISCOGS_REQUEST_TOKEN_URL,
    method: "GET",
    data: { oauth_callback: callbackUrl },
  }

  debug("Getting request token with callback:", callbackUrl)
  debug("Request data:", requestData)

  const headers = oauth.toHeader(oauth.authorize(requestData))

  try {
    const response = await fetch(requestData.url, {
      headers: {
        ...headers,
        "User-Agent": USER_AGENT,
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

// Generate authorization URL
export function getAuthorizeUrl(oauth_token: string): string {
  return `${DISCOGS_AUTHORIZE_URL}?oauth_token=${oauth_token}`
}

// Exchange request token for access token
export async function getAccessToken(
  oauth_token: string,
  oauth_token_secret: string,
  oauth_verifier: string,
): Promise<AccessTokenResponse> {
  const requestData = {
    url: DISCOGS_ACCESS_TOKEN_URL,
    method: "POST",
    data: { oauth_verifier },
  }

  debug("Getting access token")
  debug("Request data:", requestData)

  const headers = oauth.toHeader(
    oauth.authorize(requestData, {
      key: oauth_token,
      secret: oauth_token_secret,
    }),
  )

  try {
    const response = await fetch(requestData.url, {
      method: "POST",
      headers: {
        ...headers,
        "User-Agent": USER_AGENT,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      debug("Error response:", response.status, errorText)
      throw new Error(`Failed to get access token: ${response.statusText} (${errorText})`)
    }

    const data = await response.text()
    debug("Response data:", data)

    const params = new URLSearchParams(data)
    const access_token = params.get("oauth_token")
    const access_token_secret = params.get("oauth_token_secret")

    if (!access_token || !access_token_secret) {
      throw new Error("Invalid response from Discogs")
    }

    return {
      access_token,
      access_token_secret,
    }
  } catch (error) {
    debug("Error getting access token:", error)
    throw error
  }
}

// Verify access token and get user identity
export async function verifyIdentity(access_token: string, access_token_secret: string): Promise<DiscogsIdentity> {
  const requestData = {
    url: DISCOGS_IDENTITY_URL,
    method: "GET",
  }

  debug("Verifying identity")
  debug("Request data:", requestData)

  const headers = oauth.toHeader(
    oauth.authorize(requestData, {
      key: access_token,
      secret: access_token_secret,
    }),
  )

  try {
    const response = await fetch(requestData.url, {
      headers: {
        ...headers,
        "User-Agent": USER_AGENT,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      debug("Error response:", response.status, errorText)
      throw new Error(`Failed to verify identity: ${response.statusText} (${errorText})`)
    }

    const data = await response.json()
    debug("Identity data:", data)

    return data as DiscogsIdentity
  } catch (error) {
    debug("Error verifying identity:", error)
    throw error
  }
}

// Helper function to make authenticated requests to Discogs API
export async function makeAuthenticatedRequest(
  url: string,
  method: string,
  access_token: string,
  access_token_secret: string,
  data?: Record<string, any>,
) {
  const requestData = {
    url,
    method,
    data,
  }

  const headers = oauth.toHeader(
    oauth.authorize(requestData, {
      key: access_token,
      secret: access_token_secret,
    }),
  )

  try {
    const response = await fetch(url, {
      method,
      headers: {
        ...headers,
        "User-Agent": USER_AGENT,
        "Content-Type": "application/json",
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      const errorText = await response.text()
      debug("Error response:", response.status, errorText)
      throw new Error(`API request failed: ${response.statusText} (${errorText})`)
    }

    return await response.json()
  } catch (error) {
    debug("Error making authenticated request:", error)
    throw error
  }
}

// Export the OAuth instance for use in other parts of the application
export { oauth }