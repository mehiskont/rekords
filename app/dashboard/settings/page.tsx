import { DiscogsAuthButton } from "@/components/discogs-auth-button"
import { DiscogsConnectionStatus } from "@/components/discogs-connection-status"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Discogs Integration</h2>
        <p className="text-sm text-muted-foreground">Connect your Discogs account to manage your inventory.</p>
      </div>

      <DiscogsConnectionStatus />

      <div className="flex justify-start">
        <DiscogsAuthButton />
      </div>
    </div>
  )
}

