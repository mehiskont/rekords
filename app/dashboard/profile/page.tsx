import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { getUserProfile } from "@/lib/user"
import { ProfileForm } from "@/components/dashboard/profile-form"

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return null // This should be handled by the layout, but just in case
  }

  const userProfile = await getUserProfile(session.user.id)

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Your Profile</h2>
      <ProfileForm initialData={userProfile} />
    </div>
  )
}

