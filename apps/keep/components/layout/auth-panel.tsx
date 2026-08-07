"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, type FormEvent } from "react"
import {
  getSupabaseBrowserClient,
  hasSupabaseBrowserConfig,
  setSupabaseBrowserConfig,
  type SupabaseBrowserConfig,
} from "@/lib/supabase-client"

type AuthPanelProps = {
  mode: "login" | "signup" | "verify"
  supabaseConfig?: SupabaseBrowserConfig | null
}

const copy = {
  login: {
    eyebrow: "KEEP",
    title: "Sign in to Keep",
    description: "Use your GyenBox account to sync notes across devices.",
    action: "Sign in",
    linkLabel: "Create account",
    linkHref: "/signup",
  },
  signup: {
    eyebrow: "KEEP",
    title: "Create your account",
    description: "One account for Keep and the rest of GyenBox.",
    action: "Create account",
    linkLabel: "Already have an account",
    linkHref: "/login",
  },
  verify: {
    eyebrow: "KEEP",
    title: "Verify your email",
    description: "Check your inbox before returning to Keep.",
    action: "Back to login",
    linkLabel: "Back to login",
    linkHref: "/login",
  },
}

function safeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/"
  return next
}

export function AuthPanel({ mode, supabaseConfig }: AuthPanelProps) {
  const content = copy[mode]
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = safeNextPath(searchParams.get("next"))
  const linkedHref =
    nextPath === "/" ? content.linkHref : `${content.linkHref}?next=${encodeURIComponent(nextPath)}`
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setSupabaseBrowserConfig(supabaseConfig ?? null)
  }, [supabaseConfig])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    if (!hasSupabaseBrowserConfig()) {
      setMessage("Supabase key is not configured yet.")
      return
    }

    if (mode === "verify") {
      router.push("/login")
      return
    }

    setIsSubmitting(true)
    const supabase = getSupabaseBrowserClient()

    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}${nextPath}`,
            },
          })

    setIsSubmitting(false)

    if (result.error) {
      setMessage(result.error.message)
      return
    }

    if (mode === "signup" && !result.data.session) {
      setMessage("Account created. Check your email to verify before signing in.")
      return
    }

    router.push(nextPath)
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f5ee] px-6 py-10 dark:bg-zinc-950">
      <section className="w-full max-w-[420px] rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fbbc04] text-base font-bold text-zinc-900">
            K
          </span>
          <span className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">Keep</span>
        </div>

        <div className="mb-7">
          <p className="mb-2 text-xs font-bold tracking-[0.16em] text-zinc-400">{content.eyebrow}</p>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{content.title}</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{content.description}</p>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          {mode !== "verify" ? (
            <>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Email</span>
                <input
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  required
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Password</span>
                <input
                  name="password"
                  type="password"
                  placeholder={mode === "login" ? "Enter password" : "Create password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  minLength={6}
                  required
                />
              </label>
            </>
          ) : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-11 rounded-md bg-zinc-900 font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {isSubmitting ? "Working..." : content.action}
          </button>
        </form>

        {message ? (
          <p className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-300">
            {message}
          </p>
        ) : null}

        <Link
          href={linkedHref}
          className="mt-6 block text-center text-sm font-semibold text-[#5F74C4] hover:underline"
        >
          {content.linkLabel}
        </Link>
      </section>
    </main>
  )
}
