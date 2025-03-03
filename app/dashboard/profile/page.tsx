import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { getUserProfile } from "@/lib/user"
import { ProfileForm } from "@/components/dashboard/profile-form"

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  let userProfile = null;
  let dbError = false;

  if (!session) {
    return null // This should be handled by the layout, but just in case
  }

  try {
    userProfile = await getUserProfile(session.user.id);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    dbError = true;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Your Profile</h2>
      
      {dbError ? (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900 p-6">
          <p className="text-yellow-800 dark:text-yellow-400">
            We're having trouble connecting to the database right now. Profile editing is temporarily unavailable.
          </p>
          <p className="text-yellow-700 dark:text-yellow-500 text-sm mt-2">
            Try refreshing the page in a few moments.
          </p>
        </div>
      ) : (
        <ProfileForm initialData={userProfile || {
          name: session.user.name || '',
          email: session.user.email || '',
          phone: '',
          address: '',
          city: '',
          state: '',
          country: '',
          postalCode: ''
        }} />
      )}
    </div>
  )
}

