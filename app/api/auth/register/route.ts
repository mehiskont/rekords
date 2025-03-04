import { NextResponse } from "next/server";
import { z } from 'zod';
import { registerUser } from "@/lib/user";
import { log } from "@/lib/logger";

// Validation schema
const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate request body
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.format() },
        { status: 400 }
      );
    }
    
    const { email, password, name } = result.data;
    
    // Register the user
    try {
      const user = await registerUser(email, password, name);
      log(`User registered successfully: ${email}`);
      
      return NextResponse.json({ 
        success: true, 
        message: "Registration successful" 
      });
    } catch (error) {
      // Handle specific errors
      if (error instanceof Error && error.message === "User already exists") {
        return NextResponse.json(
          { error: "User already exists", message: "This email is already registered" },
          { status: 409 }
        );
      }
      
      // Unknown error
      log(`Registration error: ${error instanceof Error ? error.message : String(error)}`, "error");
      return NextResponse.json(
        { error: "Registration failed", message: "Failed to create account" },
        { status: 500 }
      );
    }
  } catch (error) {
    log(`Registration request error: ${error instanceof Error ? error.message : String(error)}`, "error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}