import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import EmailProvider from "next-auth/providers/email"
import GoogleProvider from "next-auth/providers/google"
import { Resend } from "resend"

const prisma = new PrismaClient()
const resend = new Resend(process.env.RESEND_API_KEY)

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  debug: true, // Enable debug mode to help troubleshoot
  session: {
    strategy: "jwt", // Use JWT strategy to avoid database dependency
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    EmailProvider({
      // Use Resend to send emails
      async sendVerificationRequest({ identifier, url }) {
        try {
          await resend.emails.send({
            from: "Plastik Records <auth@plastikrecords.com>",
            to: [identifier],
            subject: "Sign in to Plastik Records",
            html: `
              <div>
                <h1>Sign in to Plastik Records</h1>
                <p>Click the link below to sign in to your account:</p>
                <a href="${url}">Sign in</a>
                <p>If you didn't request this email, you can safely ignore it.</p>
              </div>
            `,
          })
        } catch (error) {
          console.error("Error sending verification email:", error)
          throw new Error("Failed to send verification email")
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        console.log("JWT callback - initial sign in:", { userId: user.id, email: user.email });
        return {
          ...token,
          userId: user.id,
        };
      }
      // Return previous token if the access token has not expired yet
      return token;
    },
    async session({ session, token, user }) {
      // Log session data for debugging
      console.log("Session callback triggered in auth.ts", { 
        hasToken: !!token, 
        hasUser: !!user,
        tokenUserId: token?.userId,
        userId: user?.id 
      });
      
      if (session?.user) {
        // Ensure we always have a user ID, preferring token-based ID for JWT strategy
        if (token?.userId) {
          session.user.id = token.userId;
          console.log("Session ID set from token:", token.userId);
        } 
        // Fallback to database user
        else if (user?.id) {
          session.user.id = user.id;
          console.log("Session ID set from user:", user.id);
        }
      }
      
      return session;
    },
    // Add signIn callback for debugging
    async signIn({ user, account, profile }) {
      console.log("Sign-in callback in auth.ts:", {
        provider: account?.provider,
        userId: user?.id,
        userEmail: user?.email
      });
      return true;
    }
  },
}

