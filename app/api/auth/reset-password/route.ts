import { NextResponse } from "next/server";
import { z } from 'zod';
import { createPasswordResetToken, resetPassword } from "@/lib/user";
import { log } from "@/lib/logger";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Validation schema for password reset request
const requestResetSchema = z.object({
  email: z.string().email("Please enter a valid email address")
});

// Validation schema for password reset
const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8, "Password must be at least 8 characters")
});

// Request a password reset
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate request body
    const result = requestResetSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.format() },
        { status: 400 }
      );
    }
    
    const { email } = result.data;
    
    try {
      // Generate reset token
      const resetToken = await createPasswordResetToken(email);
      
      // Create reset URL
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const resetUrl = `${baseUrl}/auth/reset-password/${resetToken}`;
      
      // Send email with reset link
      await resend.emails.send({
        from: "Plastik Records <auth@plastikrecords.com>",
        to: [email],
        subject: "Reset Your Password",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333; text-align: center;">Reset Your Password</h1>
            <p>Hello,</p>
            <p>You requested to reset your password. Click the link below to create a new password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" style="display: inline-block; background-color: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
            </p>
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
            <p>This link will expire in 1 hour.</p>
            <p>Thank you,<br>Plastik Records Team</p>
          </div>
        `,
      });
      
      log(`Password reset email sent to: ${email}`);
      
      // Always return success even if user doesn't exist (security best practice)
      return NextResponse.json({
        success: true,
        message: "If your email is registered, you will receive a password reset link shortly"
      });
    } catch (error) {
      // Log the error but don't expose details to client
      log(`Password reset error: ${error instanceof Error ? error.message : String(error)}`, "error");
      
      // Always return success (security best practice)
      return NextResponse.json({
        success: true,
        message: "If your email is registered, you will receive a password reset link shortly"
      });
    }
  } catch (error) {
    log(`Password reset request error: ${error instanceof Error ? error.message : String(error)}`, "error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Complete password reset with token
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    // Validate request body
    const result = resetPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.format() },
        { status: 400 }
      );
    }
    
    const { token, password } = result.data;
    
    try {
      // Reset the password
      await resetPassword(token, password);
      
      log("Password reset successful");
      
      return NextResponse.json({
        success: true,
        message: "Password has been reset successfully"
      });
    } catch (error) {
      // Handle invalid token errors
      if (error instanceof Error && error.message === "Invalid or expired token") {
        return NextResponse.json(
          { error: "Invalid token", message: "Password reset link is invalid or has expired" },
          { status: 400 }
        );
      }
      
      // Unknown error
      log(`Password reset error: ${error instanceof Error ? error.message : String(error)}`, "error");
      return NextResponse.json(
        { error: "Password reset failed", message: "Failed to reset your password" },
        { status: 500 }
      );
    }
  } catch (error) {
    log(`Password reset completion error: ${error instanceof Error ? error.message : String(error)}`, "error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}