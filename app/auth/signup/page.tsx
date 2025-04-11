import type { Metadata } from "next"
import { SignUpForm } from "@/components/auth/sign-up-form"
import dynamic from 'next/dynamic'

// Dynamically import the Background component with SSR disabled
const Background = dynamic(() => import('@/components/auth/background-animation'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-zinc-700" />
})

export const metadata: Metadata = {
  title: "Sign Up | Plastik Record Store",
  description: "Create a new account to start shopping for vinyl records",
}

export default function SignUpPage() {
  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
        <div className="absolute inset-0 bg-background" />
        <div className="relative z-20 flex h-full w-full items-center justify-center">
          <Background />
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
            <p className="text-sm text-muted-foreground">Enter your information to create a new account</p>
          </div>
          <SignUpForm />
        </div>
      </div>
    </div>
  )
}