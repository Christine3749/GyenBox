"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Github, Mail, ShieldCheck } from "lucide-react"
import { GyenBoxLogo, GyenBoxMark } from "@/components/brand/gyenbox-logo"

type AuthPanelProps = {
  mode: "login" | "signup" | "verify"
}

const copy = {
  login: {
    eyebrow: "Secure access",
    title: "Enter GyenBox",
    description: "Sign in to your private file territory.",
    action: "Sign in",
    linkLabel: "Create account",
    linkHref: "/signup",
  },
  signup: {
    eyebrow: "Private beta",
    title: "Claim your GyenBox",
    description: "Account creation opens after the storage layer is connected.",
    action: "Create account",
    linkLabel: "Already have an account",
    linkHref: "/login",
  },
  verify: {
    eyebrow: "Email check",
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
      setMessage("Use the demo account while production signup is being connected.")
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

    setMessage("Sign in failed. Check the demo credentials and try again.")
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#08090B] px-6 py-10 text-[#F4F1EA]">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.055) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#8896C6]/60 to-transparent" />

      <section className="relative grid w-full max-w-[920px] grid-cols-1 overflow-hidden rounded-lg border border-white/10 bg-[#0D1016]/95 shadow-[0_30px_90px_rgba(0,0,0,0.45)] md:grid-cols-[1fr_420px]">
        <div className="hidden min-h-[560px] border-r border-white/10 p-8 md:flex md:flex-col">
          <div className="flex items-center justify-between gap-3">
            <GyenBoxLogo showSubtitle markClassName="h-10 w-10" />
            <GyenBoxMark className="h-8 w-8 opacity-55" title="GyenBox secondary mark" />
          </div>

          <div className="mt-auto grid gap-4">
            <p className="max-w-sm text-3xl font-semibold leading-tight text-[#F4F1EA]">
              A quieter control room for files, links, and ownership.
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs text-[#89919F]">
              <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                <p className="font-mono text-lg text-[#F4F1EA]">10GB</p>
                <p className="mt-1">demo space</p>
              </div>
              <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                <p className="font-mono text-lg text-[#F4F1EA]">AES</p>
                <p className="mt-1">ready layer</p>
              </div>
              <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                <p className="font-mono text-lg text-[#F4F1EA]">v0.1</p>
                <p className="mt-1">prototype</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="mb-8 flex items-center justify-between md:hidden">
            <GyenBoxLogo showSubtitle markClassName="h-9 w-9" />
          </div>

          <div className="mb-7">
            <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-[#8896C6]/25 bg-[#8896C6]/10 px-2.5 py-1 text-xs font-medium text-[#DDE4FF]">
              <ShieldCheck className="h-3.5 w-3.5" />
              {content.eyebrow}
            </div>
            <h1 className="text-2xl font-semibold tracking-normal text-[#F4F1EA]">{content.title}</h1>
            <p className="mt-2 text-sm leading-6 text-[#89919F]">{content.description}</p>
          </div>

          {mode === "login" ? (
            <div className="mb-5 rounded-md border border-white/10 bg-white/[0.035] p-3 text-xs leading-5 text-[#AAB2C0]">
              <p className="font-semibold text-[#F4F1EA]">Demo access</p>
              <p>Email: demo@gyenbox.com</p>
              <p>Password: GyenBox-2026!</p>
            </div>
          ) : null}

          <form className="grid gap-4" onSubmit={handleSubmit}>
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
                  className="border-white/10 bg-[#090B10] text-[#F4F1EA] placeholder:text-[#586071] focus-visible:ring-[#8896C6]"
                />
                <Input
                  label="Password"
                  name="password"
                  type="password"
                  placeholder="Enter password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="border-white/10 bg-[#090B10] text-[#F4F1EA] placeholder:text-[#586071] focus-visible:ring-[#8896C6]"
                />
              </>
            ) : (
              <Input label="Email" name="email" type="email" placeholder="you@example.com" />
            )}
            <Button className="h-10 w-full bg-[#8896C6] text-[#0A0E14] hover:bg-[#7B89BD]" type="submit" disabled={isSubmitting}>
              <Mail className="h-4 w-4" />
              {isSubmitting ? "Signing in..." : content.action}
            </Button>
            <Button
              variant="outline"
              className="h-10 w-full border-white/10 bg-transparent text-[#C7CFDC] hover:bg-white/[0.04] hover:text-white"
              type="button"
              onClick={() => setMessage("GitHub login is next after OAuth setup.")}
            >
              <Github className="h-4 w-4" />
              Continue with GitHub
            </Button>
          </form>

          {message ? <p className="mt-4 rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-[#AAB2C0]">{message}</p> : null}

          <Link href={content.linkHref} className="mt-6 block text-center text-sm text-[#DDE4FF] hover:text-[#8896C6]">
            {content.linkLabel}
          </Link>
        </div>
      </section>
    </main>
  )
}
