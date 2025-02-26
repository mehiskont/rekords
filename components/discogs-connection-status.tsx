"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"

interface DiscogsAuthStatus {
  isConnected: boolean
  username?: string
  lastVerified?: string
}

export function DiscogsConnectionStatus() {
  const [status, setStatus] = useState<DiscogsAuthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkStatus() {
      try {
        const response = await fetch("/api/auth/discogs/status")
        const data = await response.json()
        setStatus(data)
      } catch (err) {
        setError("Failed to check Discogs connection status")
      } finally {
        setLoading(false)
      }
    }

    checkStatus()
  }, [])

  if (loading) {
    return <div>Checking Discogs connection status...</div>
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (status?.isConnected) {
    return (
      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>Connected to Discogs</AlertTitle>
        <AlertDescription>
          Connected as {status.username}
          {status.lastVerified && (
            <span className="block text-sm text-muted-foreground">
              Last verified: {new Date(status.lastVerified).toLocaleString()}
            </span>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Not connected to Discogs</AlertTitle>
      <AlertDescription>Connect your Discogs account to manage your inventory.</AlertDescription>
    </Alert>
  )
}

