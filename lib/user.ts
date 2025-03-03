import { prisma } from "@/lib/prisma"

export async function getUserProfile(userId: string) {
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        address: true,
        city: true,
        country: true,
        postalCode: true,
      },
    });
  } catch (error) {
    console.error("Database error in getUserProfile:", error);
    throw error; // Let the caller handle the error
  }
}

