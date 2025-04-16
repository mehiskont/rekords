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
  debug: true, // Always enable debug for troubleshooting
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
          log("[Credentials Provider] Missing email or password", {}, "warn");
          return null;
        }

        const { email, password } = credentials;
        // Use the environment variable for the backend API URL (SERVER-SIDE)
        const loginApiUrl = process.env.API_BASE_URL
          ? `${process.env.API_BASE_URL}/api/auth/login`
          : null; 

        if (!loginApiUrl) {
          log("[Credentials Provider] API base URL not configured (API_BASE_URL missing)", {}, "error");
          return null;
        }

        // TEMPORARY FALLBACK: Check if using test accounts for local development
        const testEmail = process.env.TEST_USER_EMAIL || "test@example.com";
        const testPassword = process.env.TEST_USER_PASSWORD || "password123";
        const adminEmail = process.env.ADMIN_USER_EMAIL || "admin@example.com";
        const adminPassword = process.env.ADMIN_USER_PASSWORD || "admin123";
        const useFallback = process.env.AUTH_FORCE_FALLBACK === "true";
        
        // For development with test accounts
        if (useFallback) {
          log("[Credentials Provider] Using fallback authentication", { email }, "info");
          
          if (email === testEmail && password === testPassword) {
            return {
              id: "test-user-id-123",
              name: "Test User",
              email: testEmail,
            };
          }
          
          if (email === adminEmail && password === adminPassword) {
            return {
              id: "admin-user-id-456",
              name: "Admin User",
              email: adminEmail,
              role: "admin"
            };
          }
          
          log("[Credentials Provider] Fallback authentication failed", { email }, "warn");
          return null;
        }
        
        // Normal API-based authentication
        try {
          log(`[Credentials Provider] Calling backend login API: ${loginApiUrl}`, { email }, "info");
          // Add log to show actual request details
          log(`[Credentials Provider] Request details for ${loginApiUrl}`, {
            method: 'POST',
            headers: { contentType: 'application/json' },
            body: { email, passwordLength: password?.length || 0 }
          }, "info");
          
          const response = await fetch(loginApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          if (response.ok) {
            let userData;
            try {
              userData = await response.json();
            } catch (error) {
              log("[Credentials Provider] Failed to parse response JSON", { error }, "error");
              return null;
            }
            log("[Credentials Provider] Backend login successful", { email, userId: userData.user?.id }, "info");
            // Ensure the returned object matches the NextAuth User type
            // Expecting backend to return { user: { id: '...', name: '...', email: '...' } } on success
            if (userData && userData.user) {
              return {
                id: userData.user.id,
                name: userData.user.name,
                email: userData.user.email,
                // image: userData.user.image, // Add if your backend provides it
              };
            } else {
              log("[Credentials Provider] Backend login response missing user data", { email }, "error");
              return null; // Malformed success response from backend
            }
          } else {
            try {
              // Try to get the error response body to see what went wrong
              const errorData = await response.text();
              log(`[Credentials Provider] Backend login failed with status: ${response.status}`, { 
                email, 
                errorBody: errorData,
                url: loginApiUrl
              }, "warn");
            } catch (e) {
              log(`[Credentials Provider] Backend login failed with status: ${response.status}`, { 
                email,
                responseError: String(e),
                url: loginApiUrl
              }, "warn");
            }
            // For 401 or other errors, authentication fails
            return null;
          }
        } catch (error) {
          log("[Credentials Provider] Error calling backend login API", { error }, "error");
          console.error("Credentials Provider Error:", error);
          return null; // Network error or other exception
        }

        // --- OLD HARDCODED LOGIC REMOVED ---
        // const testEmail = process.env.TEST_USER_EMAIL || "test@example.com";
        // const testPassword = process.env.TEST_USER_PASSWORD || "password123";
        // const adminEmail = process.env.ADMIN_USER_EMAIL || "admin@example.com";
        // const adminPassword = process.env.ADMIN_USER_PASSWORD || "admin123";
        // 
        // if (credentials.email === testEmail && credentials.password === testPassword) { ... }
        // if (credentials.email === adminEmail && credentials.password === adminPassword) { ... }
        // log("Credentials did not match fallback users", { email: credentials.email }, "warn");
        // return null;
        // --- END OLD HARDCODED LOGIC ---
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
      profile(profile: Profile & { sub: string; name?: string; email?: string; picture?: string; }): User {
        log("Google auth: processing profile", { email: profile.email }, "info");
        
        // Validate required fields
        if (!profile.sub || !profile.email) {
          throw new Error("Missing required Google profile information");
        }
        
        // We map standard fields, the backend API will handle user creation/linking
        return {
          id: profile.sub, // Use Google's unique ID
          name: profile.name || "",
          email: profile.email,
          image: profile.picture || null,
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
    async session({ session, token }: { session: Session; token: JWT; }): Promise<Session> {
      // The default Session type might not have `id` on `session.user`.
      if (token && session.user && typeof token.userId === 'string') {
        // Add user ID to session safely
        session.user = {
          ...session.user,
          id: token.userId
        };
        
        // Add provider info if available
        if (token.provider) {
          // Use type assertion since we're extending the Session type
          (session as any).provider = token.provider;
        }
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

