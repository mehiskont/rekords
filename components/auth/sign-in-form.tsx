"use client"

import * as React from "react"
import { signIn } from "next-auth/react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Icons } from "@/components/icons"
import { useToast } from "@/components/ui/use-toast"
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs"

interface SignInFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SignInForm({ className, ...props }: SignInFormProps) {
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [email, setEmail] = React.useState<string>("")
  const [password, setPassword] = React.useState<string>("")

  // Forces the redirect to the dashboard page
  const callbackUrl = "/dashboard"

  // Email magic link sign in - this functionality has been disabled
  // The email provider has been conditionally disabled in auth.ts if not properly configured
  async function onMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn("email", {
        email,
        callbackUrl,
        redirect: false,
      })

      if (!result?.error) {
        toast({
          title: "Check your email",
          description: "We sent you a login link. Be sure to check your spam too.",
        })
      } else {
        console.error("Magic link error:", result.error);
        toast({
          title: "Email login unavailable",
          description: "Please use password or Google sign-in instead.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Magic link exception:", error);
      toast({
        title: "Something went wrong",
        description: "Your sign in request failed. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Password sign in
  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      console.log("Attempting to sign in with credentials", { email, callbackUrl });
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl,
        redirect: false,
      })

      if (!result?.error) {
        // Successful login, redirect to callbackUrl or dashboard
        console.log("Sign in successful, redirecting to", callbackUrl);
        toast({
          title: "Welcome back!",
          description: "You've been successfully signed in.",
        })
        router.push(callbackUrl)
      } else {
        console.error("Authentication error:", result.error);
        toast({
          title: "Authentication failed",
          description: "Your email or password is incorrect.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Sign in exception:", error);
      toast({
        title: "Something went wrong",
        description: "Your sign in request failed. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid gap-6" {...props}>
      <form onSubmit={onPasswordSubmit}>
        <div className="grid gap-2">
          <div className="grid gap-1 mb-3">
            <Label htmlFor="email-password">Email</Label>
            <Input
              id="email-password"
              placeholder="name@example.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1 mb-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link 
                href="/auth/reset-password" 
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="mt-1 text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
              <strong>Database unavailable!</strong> Use test account:<br />
              Email: test@example.com<br />
              Password: password123
            </div>
            <Input
              id="password"
              placeholder="••••••••"
              type="password"
              autoCapitalize="none"
              autoComplete="current-password"
              disabled={isLoading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button disabled={isLoading} className="mt-4">
            {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Sign in
          </Button>
        </div>
      </form>
      <div className="mt-4 text-center text-sm">
        Don't have an account?{" "}
        <Link href="/auth/signup" className="text-primary hover:underline">
          Sign up
        </Link>
      </div>
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>
      
      <Button
        variant="outline"
        type="button"
        disabled={isLoading}
        onClick={() => {
          setIsLoading(true)
          // Log the attempt with the callback URL
          console.log("Attempting Google sign in with callbackUrl:", callbackUrl);
          
          // Use redirect: true for OAuth providers to complete the flow
          signIn("google", { 
            callbackUrl,
            redirect: true
          }).catch(error => {
            console.error("Google sign in error:", error);
            setIsLoading(false);
            toast({
              title: "Authentication Error",
              description: "Error signing in with Google. Please try again.",
              variant: "destructive",
            });
          });
        }}
      >
        {isLoading ? (
          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Icons.google className="mr-2 h-4 w-4" />
        )}
        Google
      </Button>
    </div>
  )
}

