"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { signIn } from "next-auth/react"
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
  const router = useRouter()
  const [email, setEmail] = useState(mode === "login" ? "demo@gyenbox.com" : "")
  const [password, setPassword] = useState(mode === "login" ? "GyenBox-2026!" : "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (mode !== "login") {
      setMessage("Account creation is coming next. Use the demo account for now.")
      return
    }

    setIsSubmitting(true)
    setMessage(null)

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/workspace",
    })

    setIsSubmitting(false)

    if (result?.ok) {
      router.push(result.url ?? "/workspace")
      router.refresh()
      return
    }

    setMessage("Sign in failed. Try the demo credentials shown below.")
  }

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

        {mode === "login" ? (
          <div className="mt-5 rounded-md border border-primary/30 bg-primary/10 p-3 text-xs leading-5 text-muted-foreground">
            <p className="font-semibold text-foreground">Demo access</p>
            <p>Email: demo@gyenbox.com</p>
            <p>Password: GyenBox-2026!</p>
          </div>
        ) : null}

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          {mode !== "verify" ? (
            <>
              <Input
                label="Email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Input
                label="Password"
                name="password"
                type="password"
                placeholder="Enter password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </>
          ) : (
            <Input label="Email" name="email" type="email" placeholder="you@example.com" />
          )}
          <Button className="w-full" type="submit" disabled={isSubmitting}>
            <Mail className="h-4 w-4" />
            {isSubmitting ? "Signing in..." : content.action}
          </Button>
          <Button variant="outline" className="w-full" type="button" onClick={() => setMessage("GitHub login is next after OAuth setup.")}>
            <Github className="h-4 w-4" />
            Continue with GitHub
          </Button>
        </form>

        {message ? (
          <p className="mt-4 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p>
        ) : null}

        <Link href={content.linkHref} className="mt-5 block text-center text-sm text-primary hover:underline">
          {content.linkLabel}
        </Link>
      </section>
    </main>
  )
}
