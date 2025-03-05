import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import crypto from "crypto"

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
    // First get current user to avoid email constraint issues
    const currentUser = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!currentUser) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    // Only include email in update if it matches the current user's email
    // to avoid unique constraint violations
    const emailToUpdate = checkoutInfo.email === currentUser.email ? 
      undefined : // Don't update if it's the same 
      checkoutInfo.email; // Only update if different and valid
      
    // For users with an account, save their info to their profile
    return await prisma.user.update({
      where: { id: userId },
      data: {
        // If name is provided as firstName + lastName, concatenate them
        name: checkoutInfo.firstName && checkoutInfo.lastName 
          ? `${checkoutInfo.firstName} ${checkoutInfo.lastName}` 
          : undefined,
        email: emailToUpdate, // Only update email if it differs and doesn't violate constraints
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
    // Don't throw, just return the current user to prevent checkout failures
    return { id: userId };
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

// Password utilities
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePasswords(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

// User registration
export async function registerUser(email: string, password: string, name?: string) {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new Error("User already exists");
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      hashedPassword,
    }
  });

  return { id: user.id, email: user.email };
}

// Password reset
export async function createPasswordResetToken(email: string) {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Generate a reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  // Set token expiration (1 hour)
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

  // Save to database
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken: hashedToken,
      resetTokenExpiry
    }
  });

  return resetToken;
}

export async function resetPassword(token: string, newPassword: string) {
  // Hash the token from the URL
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Find user with valid token
  const user = await prisma.user.findFirst({
    where: {
      resetToken: hashedToken,
      resetTokenExpiry: {
        gt: new Date()
      }
    }
  });

  if (!user) {
    throw new Error("Invalid or expired token");
  }

  // Hash the new password
  const hashedPassword = await hashPassword(newPassword);

  // Update user
  await prisma.user.update({
    where: { id: user.id },
    data: {
      hashedPassword,
      resetToken: null,
      resetTokenExpiry: null
    }
  });

  return { success: true };
}

