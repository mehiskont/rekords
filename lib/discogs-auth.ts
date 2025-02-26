import OAuth from "oauth-1.0a"
import crypto from "crypto"

const DISCOGS_API_URL = "https://api.discogs.com"
const DISCOGS_AUTH_URL = "https://www.discogs.com/oauth"

// Create OAuth 1.0a instance
const oauth = new OAuth({
  consumer: {
    key: process.env.DISCOGS_API_TOKEN!,
    secret: process.env.DISCOGS_API_SECRET!,
  },
  signature_method: "HMAC-SHA1",
  hash_function(base_string, key) {
    return crypto.createHmac("sha1", key).update(base_string).digest("base64")
  },
})

export async function getRequestToken(callbackUrl: string) {
  const requestData = {
    url: `${DISCOGS_AUTH_URL}/request_token`,
    method: "GET",
  }

  const headers = oauth.toHeader(oauth.authorize(requestData))

  try {
    const response = await fetch(requestData.url, {
      headers: {
        ...headers,
        "User-Agent": "PlastikRecordStore/1.0",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get request token: ${response.statusText}`)
    }

    const data = await response.text()
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
    console.error("Error getting request token:", error)
    throw error
  }
}

export async function getAccessToken(oauth_token: string, oauth_token_secret: string, oauth_verifier: string) {
  const requestData = {
    url: `${DISCOGS_AUTH_URL}/access_token`,
    method: "POST",
  }

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
        "User-Agent": "PlastikRecordStore/1.0",
        oauth_verifier: oauth_verifier,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`)
    }

    const data = await response.text()
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
    console.error("Error getting access token:", error)
    throw error
  }
}

export async function verifyIdentity(access_token: string, access_token_secret: string) {
  const requestData = {
    url: `${DISCOGS_API_URL}/oauth/identity`,
    method: "GET",
  }

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
        "User-Agent": "PlastikRecordStore/1.0",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to verify identity: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error verifying identity:", error)
    throw error
  }
}

