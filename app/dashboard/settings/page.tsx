import { DiscogsAuthButton } from "@/components/discogs-auth-button"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Settings</h2>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Discogs Integration</h3>
        <p className="text-muted-foreground">
          Connect your Discogs seller account to automatically manage your inventory.
        </p>
        <DiscogsAuthButton />
      </div>
    </div>
  )
}

