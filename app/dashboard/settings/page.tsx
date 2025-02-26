import { getServerSession } from "next-auth/next"
import { DiscogsAuthButton } from "@/components/discogs-auth-button"
import { DiscogsStatus } from "@/components/discogs-status"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)

  // Get Discogs connection status if user is logged in
  let discogsConnection = null
  if (session?.user?.email) {
    discogsConnection = await prisma.discogsAuth.findFirst({
      where: {
        username: process.env.DISCOGS_USERNAME,
      },
    })
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Settings</h2>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Discogs Integration</h3>
        <p className="text-muted-foreground">
          Connect your Discogs seller account to automatically manage your inventory.
        </p>

        <DiscogsStatus connection={discogsConnection} />

        {!discogsConnection && <DiscogsAuthButton />}
      </div>
    </div>
  )
}

