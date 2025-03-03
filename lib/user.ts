import { prisma } from "@/lib/prisma"

export interface UserProfile {
  name?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string; // Added phone for profile completeness
}

export interface CheckoutInfo {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  apartment?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export async function getUserProfile(userId: string) {
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        address: true,
        city: true,
        state: true,
        country: true,
        postalCode: true,
        phone: true, // Added phone field
      },
    });
  } catch (error) {
    console.error("Database error in getUserProfile:", error);
    throw error; // Let the caller handle the error
  }
}

export async function saveUserCheckoutInfo(userId: string, checkoutInfo: CheckoutInfo) {
  try {
    // For users with an account, save their info to their profile
    return await prisma.user.update({
      where: { id: userId },
      data: {
        // If name is provided as firstName + lastName, concatenate them
        name: checkoutInfo.firstName && checkoutInfo.lastName 
          ? `${checkoutInfo.firstName} ${checkoutInfo.lastName}` 
          : undefined,
        email: checkoutInfo.email,
        phone: checkoutInfo.phone,
        address: checkoutInfo.address,
        city: checkoutInfo.city,
        state: checkoutInfo.state,
        country: checkoutInfo.country,
        postalCode: checkoutInfo.postalCode,
      },
    });
  } catch (error) {
    console.error("Database error in saveUserCheckoutInfo:", error);
    throw error;
  }
}

// Convert a user profile to checkout info format
export function profileToCheckoutInfo(profile: UserProfile | null): CheckoutInfo {
  if (!profile) return {};
  
  // Split name into first and last if present
  let firstName = '';
  let lastName = '';
  if (profile.name) {
    const nameParts = profile.name.split(' ');
    firstName = nameParts[0] || '';
    lastName = nameParts.slice(1).join(' ') || '';
  }
  
  return {
    firstName,
    lastName,
    email: profile.email,
    phone: profile.phone,
    address: profile.address,
    city: profile.city,
    state: profile.state,
    country: profile.country,
    postalCode: profile.postalCode,
  };
}

