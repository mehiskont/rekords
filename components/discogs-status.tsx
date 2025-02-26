import { CheckCircle2, XCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface DiscogsStatusProps {
  connection: {
    username: string
    lastVerified: Date
  } | null
}

export function DiscogsStatus({ connection }: DiscogsStatusProps) {
  if (!connection) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Not Connected</AlertTitle>
        <AlertDescription>
          Your Discogs seller account is not connected. Connect your account to enable automatic inventory management.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert>
      <CheckCircle2 className="h-4 w-4 text-green-500" />
      <AlertTitle>Connected to Discogs</AlertTitle>
      <AlertDescription>
        Connected as {connection.username}
        <br />
        Last verified: {new Date(connection.lastVerified).toLocaleString()}
      </AlertDescription>
    </Alert>
  )
}

