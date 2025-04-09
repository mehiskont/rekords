// import { PrismaAdapter } from "@auth/prisma-adapter"
// import { PrismaClient } from "@prisma/client"
import EmailProvider from "next-auth/providers/email"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
// import { Resend } from "resend" // Keep if needed for email provider, remove otherwise
// import bcrypt from "bcryptjs" // Remove if not comparing passwords here
import { log } from "./logger"
// import { testDatabaseConnection } from "./prisma" // Remove
// import { prisma } from "./prisma" // Remove
// Import necessary types from next-auth
import type { NextAuthOptions, User, Account, Profile, Session, CallbacksOptions } from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import type { JWT } from "next-auth/jwt";

// const resend = new Resend(process.env.RESEND_API_KEY) // Keep if needed

// Remove all adapter initialization logic
// let adapterInitialized = false
// let prismaAdapter
// async function initPrismaAdapter() { ... }
// initPrismaAdapter().catch(...) 

// Remove email provider function if not using email provider
// function isEmailProviderConfigured() { ... }

export const authOptions: NextAuthOptions = {
  // Remove adapter entirely - Frontend will not manage user persistence
  // adapter: { ... }, 
  debug: process.env.NODE_ENV === 'development', // Enable debug only in development
  session: {
    strategy: "jwt", // JWT is essential without a database adapter
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    // Credentials provider - simplified for fallback/testing only
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      // Explicitly type credentials
      async authorize(credentials: Record<string, string> | undefined): Promise<User | null> {
        log("[Credentials Provider] Authorize attempt", { email: credentials?.email }, "info");
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // --- NO DATABASE CHECK --- 
        // Frontend cannot securely verify passwords against a remote API here.
        // This provider should ideally be removed or only used for specific
        // non-standard flows if absolutely necessary.
        // Keeping the test/admin fallback for potential temporary use.

        const testEmail = process.env.TEST_USER_EMAIL || "test@example.com";
        const testPassword = process.env.TEST_USER_PASSWORD || "password123";
        const adminEmail = process.env.ADMIN_USER_EMAIL || "admin@example.com";
        const adminPassword = process.env.ADMIN_USER_PASSWORD || "admin123";

        if (credentials.email === testEmail && credentials.password === testPassword) {
          log("Using test user auth as fallback", {}, "info");
          // Return type must match User
          return { id: "test-user-id-123", email: testEmail, name: "Test User" };
        }
        
        if (credentials.email === adminEmail && credentials.password === adminPassword) {
          log("Using admin user auth as fallback", {}, "info");
          // Return type must match User
          return { id: "admin-user-id-456", email: adminEmail, name: "Admin User" };
        }

        log("Credentials did not match fallback users", { email: credentials.email }, "warn");
        // If credentials don't match fallbacks, deny access.
        // Authentication MUST happen against the backend API for real users.
        return null;
      }
    }),
    // Google OAuth provider - remains largely the same
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      },
      // Explicitly type profile
      profile(profile: Profile & { sub: string; name: string; email: string; picture: string; }): User {
        log("Google auth: processing profile", { email: profile.email }, "info");
        // We map standard fields, the backend API will handle user creation/linking
        return {
          id: profile.sub, // Use Google's unique ID
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          // Ensure role is not assumed here; backend should manage roles
        }
      }
    })
    // Add other OAuth providers here (GitHub, etc.) if needed
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error", // Error code passed in query string
    // verifyRequest: '/auth/verify-request', // If using Email provider
    // newUser: '/auth/new-user' // Optional: Redirect new users
  },
  callbacks: {
    // Type parameters for JWT callback
    async jwt({ token, user, account, profile }: { token: JWT; user?: User | AdapterUser; account?: Account | null; profile?: Profile; }): Promise<JWT> {
      if (account && user) {
        token.userId = user.id; 
        token.provider = account.provider;
      }
      return token;
    },
    // Type parameters for session callback
    async session({ session, token }: { session: Session; token: JWT; user: User | AdapterUser; }): Promise<Session> {
      // The default Session type might not have `id` on `session.user`.
      // We need to extend the Session type or assert the type carefully.
      if (token && session.user) {
        // Extend the Session user type inline or define a custom type
        (session.user as { id: string; name?: string | null; email?: string | null; image?: string | null }).id = token.userId as string;
        (session as any).provider = token.provider; 
      }
      return session;
    },
    // Type parameters for signIn callback
    async signIn({ user, account, profile, email, credentials }: { user: User | AdapterUser; account?: Account | null; profile?: Profile; email?: { verificationRequest?: boolean }; credentials?: Record<string, unknown>; }): Promise<boolean | string> {
      log("SignIn callback triggered", { userId: user.id, provider: account?.provider }, "info");
      // Example: Allow only specific providers or check email domain
      // if (account?.provider === "google" && !profile?.email?.endsWith("@example.com")) {
      //   return false; // Deny sign-in
      // }
      return true; // Allow sign-in
    }
  },
  // Add events for logging if needed
  events: {
    // Type message parameter for events
    async signIn(message: { user: User; account: Account | null; isNewUser?: boolean }) { log("Successful sign in", { user: message.user, account: message.account }, "info") },
    async signOut(message: { session?: Session; token?: JWT }) { log("Sign out", { session: message.session, token: message.token }, "info") },
    // async createUser(message) { log("Create user event", { user: message.user }, "info") }, // Not applicable without adapter
    // async linkAccount(message) { log("Link account event", { user: message.user, account: message.account }, "info") }, // Not applicable without adapter
  },
}

