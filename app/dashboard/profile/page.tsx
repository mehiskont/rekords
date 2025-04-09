import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { ProfileForm } from "@/components/dashboard/profile-form"
import { log } from "@/lib/logger"

const EXTERNAL_API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  let userProfile = null;
  let apiError = false;

  if (!session?.user?.id) {
    log("Profile page: No session or user ID found.", "warn");
    return (
       <div className="space-y-6 pb-8 pt-6">
         <h2 className="text-3xl font-bold tracking-tight">Your Profile</h2>
         <p>Please log in to view your profile.</p>
       </div>
    );
  }

  if (EXTERNAL_API_URL) {
     try {
       const response = await fetch(`${EXTERNAL_API_URL}/api/users/me/profile`, {
         method: 'GET',
         headers: {
           'Content-Type': 'application/json',
         },
         cache: 'no-store'
       });

       if (!response.ok) {
         const errorBody = await response.text();
         log(`Failed to fetch profile from external API: ${response.status} - ${errorBody}`, "error");
         throw new Error(`API error: ${response.statusText}`);
       }

       const fetchedProfile = await response.json();
       log("User profile data loaded from API:", fetchedProfile);

       userProfile = {
         name: fetchedProfile.name || session.user.name || '',
         email: fetchedProfile.email || session.user.email || '',
         phone: fetchedProfile.phone || '',
         address: fetchedProfile.address || '',
         city: fetchedProfile.city || '',
         state: fetchedProfile.state || '',
         country: fetchedProfile.country || '',
         postalCode: fetchedProfile.postalCode || '',
       };

     } catch (error) {
       log(`Error fetching user profile from external API: ${error instanceof Error ? error.message : String(error)}`, "error");
       apiError = true;
     }
  } else {
     log("External API URL is not configured", "error");
     apiError = true;
  }

  const initialFormData = userProfile || {
     name: session.user.name || '',
     email: session.user.email || '',
     phone: '',
     address: '',
     city: '',
     state: '',
     country: '',
     postalCode: '',
  };

  return (
    <div className="space-y-6 pb-8 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Your Profile</h2>
      
      {apiError ? (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900 p-6">
          <p className="text-yellow-800 dark:text-yellow-400">
            We're having trouble loading your profile information right now.
          </p>
          <p className="text-yellow-700 dark:text-yellow-500 text-sm mt-2">
            Please try refreshing the page in a few moments.
          </p>
        </div>
      ) : (
        <ProfileForm initialData={initialFormData} />
      )}
    </div>
  )
}

