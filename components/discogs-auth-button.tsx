"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export function DiscogsAuthButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handleAuth = async () => {
    setIsLoading(true)

    try {
      const callbackUrl = `${window.location.origin}/api/auth/discogs/callback`
      const response = await fetch(`/api/auth/discogs?callbackUrl=${encodeURIComponent(callbackUrl)}`)

      if (!response.ok) {
        throw new Error("Failed to initialize Discogs authentication")
      }

      const { oauth_token } = await response.json()

      // Redirect to Discogs authorization page
      window.location.href = `https://www.discogs.com/oauth/authorize?oauth_token=${oauth_token}`
    } catch (error) {
      console.error("Error starting Discogs auth:", error)
      // You might want to show an error message to the user here
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleAuth} disabled={isLoading}>
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting to Discogs...
        </>
      ) : (
        "Connect Discogs Account"
      )}
    </Button>
  )
}

