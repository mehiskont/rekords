import { getServerSession } from "next-auth/next"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { comparePasswords, hashPassword } from "@/lib/user"
import { z } from "zod"
import { log } from "@/lib/logger"

// Validation schema for password change
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(8, "Current password must be at least 8 characters"),
  newPassword: z.string().min(8, "New password must be at least 8 characters")
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    
    // Validate request body
    const result = passwordChangeSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.format() },
        { status: 400 }
      );
    }
    
    const { currentPassword, newPassword } = result.data;

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user || !user.hashedPassword) {
      return NextResponse.json(
        { error: "Not allowed", message: "Password change is not available for this account" },
        { status: 400 }
      );
    }

    // Verify current password
    const isPasswordValid = await comparePasswords(currentPassword, user.hashedPassword);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid password", message: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update the user's password
    await prisma.user.update({
      where: { id: session.user.id },
      data: { hashedPassword }
    });

    log(`Password changed successfully for user ${user.email}`);

    return NextResponse.json({
      success: true,
      message: "Password updated successfully"
    });
  } catch (error) {
    log(`Password change error: ${error instanceof Error ? error.message : String(error)}`, "error");
    return NextResponse.json(
      { error: "Internal server error", message: "Failed to change password" },
      { status: 500 }
    );
  }
}