import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Box, Github, Mail } from "lucide-react"

type AuthPanelProps = {
  mode: "login" | "signup" | "verify"
}

const copy = {
  login: {
    title: "Enter your territory",
    description: "Sign in to continue managing sovereign storage.",
    action: "Sign in",
    linkLabel: "Create account",
    linkHref: "/signup",
  },
  signup: {
    title: "Claim your GyenBox",
    description: "Create an account for encrypted file ownership.",
    action: "Create account",
    linkLabel: "Already have an account",
    linkHref: "/login",
  },
  verify: {
    title: "Verify your email",
    description: "Check your inbox for the secure sign-in link.",
    action: "Resend link",
    linkLabel: "Back to login",
    linkHref: "/login",
  },
}

export function AuthPanel({ mode }: AuthPanelProps) {
  const content = copy[mode]

  return (
    <main className="territorial-grid flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-glow">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Box className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">GyenBox 疆域盒子</p>
            <p className="text-xs text-muted-foreground">Your data. Your territory.</p>
          </div>
        </div>
        <h1 className="text-xl font-semibold">{content.title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{content.description}</p>
        <div className="mt-6 grid gap-4">
          {mode !== "verify" ? (
            <>
              <Input label="Email" type="email" placeholder="you@example.com" />
              <Input label="Password" type="password" placeholder="••••••••" />
            </>
          ) : (
            <Input label="Email" type="email" placeholder="you@example.com" />
          )}
          <Button className="w-full">
            <Mail className="h-4 w-4" />
            {content.action}
          </Button>
          <Button variant="outline" className="w-full">
            <Github className="h-4 w-4" />
            Continue with GitHub
          </Button>
        </div>
        <Link href={content.linkHref} className="mt-5 block text-center text-sm text-primary hover:underline">
          {content.linkLabel}
        </Link>
      </section>
    </main>
  )
}
