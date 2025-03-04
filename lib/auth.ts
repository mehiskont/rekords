import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import EmailProvider from "next-auth/providers/email"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { Resend } from "resend"
import bcrypt from "bcryptjs"

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
    // Credentials provider for email/password login
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Find user by email
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });

          // Check if user exists and has a password
          if (!user || !user.hashedPassword) {
            return null;
          }

          // Verify password
          const passwordMatch = await bcrypt.compare(
            credentials.password,
            user.hashedPassword
          );

          if (!passwordMatch) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name
          };
        } catch (error) {
          console.error("Error in credentials authorization:", error);
          return null;
        }
      }
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
    async session({ session, token }) {
      // In JWT strategy, we primarily use token, not user
      // User param may be undefined with JWT strategy
      
      if (session?.user && token) {
        // Set user ID from token (in JWT mode, this is our source of truth)
        if (token.userId) {
          session.user.id = token.userId;
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

