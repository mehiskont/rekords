import { prisma } from "@/lib/prisma"

export async function getUserProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      address: true,
      city: true,
      country: true,
      postalCode: true,
    },
  })
}

