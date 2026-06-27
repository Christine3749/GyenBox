"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Github, Mail, ShieldCheck } from "lucide-react";
import { GyenBoxLogo, GyenBoxMark } from "@/components/brand/gyenbox-logo";
import {
  getSupabaseBrowserClient,
  hasSupabaseBrowserConfig,
  setSupabaseBrowserConfig,
  type SupabaseBrowserConfig,
} from "@/lib/supabase-client";

type AuthPanelProps = {
  mode: "login" | "signup" | "verify";
  supabaseConfig?: SupabaseBrowserConfig | null;
};

const copy = {
  login: {
    eyebrow: "SECURE ACCESS",
    title: "Enter GyenBox",
    description: "Sign in to your private file territory.",
    action: "Sign in",
    linkLabel: "Create account",
    linkHref: "/signup",
  },
  signup: {
    eyebrow: "PRIVATE BETA",
    title: "Claim your GyenBox",
    description: "Create your account for a quieter file workspace.",
    action: "Create account",
    linkLabel: "Already have an account",
    linkHref: "/login",
  },
  verify: {
    eyebrow: "EMAIL CHECK",
    title: "Verify your email",
    description: "Check your inbox before returning to GyenBox.",
    action: "Back to login",
    linkLabel: "Back to login",
    linkHref: "/login",
  },
};

export function AuthPanel({ mode, supabaseConfig }: AuthPanelProps) {
  const content = copy[mode];
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const linkedHref =
    nextPath === "/workspace"
      ? content.linkHref
      : `${content.linkHref}?next=${encodeURIComponent(nextPath)}`;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setSupabaseBrowserConfig(supabaseConfig ?? null);
  }, [supabaseConfig]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!hasSupabaseBrowserConfig()) {
      setMessage("Supabase key is not configured yet.");
      return;
    }

    if (mode === "verify") {
      router.push("/login");
      return;
    }

    setIsSubmitting(true);
    const supabase = getSupabaseBrowserClient();

    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}${nextPath}`,
            },
          });

    setIsSubmitting(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setMessage(
        "Account created. Check your email to verify before signing in.",
      );
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  async function handleGithubLogin() {
    setMessage(null);
    if (!hasSupabaseBrowserConfig()) {
      setMessage("Supabase key is not configured yet.");
      return;
    }

    const { error } = await getSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}${nextPath}` },
    });
    if (error) setMessage(error.message);
  }

  return (
    <main className="gb-paper-grid flex min-h-screen items-center justify-center px-6 py-10 text-[var(--gb-ink)]">
      <section className="grid w-full max-w-[940px] grid-cols-1 overflow-hidden border border-[var(--gb-line-strong)] bg-[var(--gb-paper-raised)] shadow-[var(--gb-shadow)] md:grid-cols-[1fr_390px]">
        <div className="hidden min-h-[560px] flex-col border-r border-[var(--gb-line)] bg-[var(--gb-paper-muted)] md:flex">
          <div className="gb-titlebar flex h-9 items-center justify-between px-4">
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full border border-[var(--gb-line-strong)] bg-[#E9B4AC]" />
              <span className="h-2.5 w-2.5 rounded-full border border-[var(--gb-line-strong)] bg-[#E8D28F]" />
              <span className="h-2.5 w-2.5 rounded-full border border-[var(--gb-line-strong)] bg-[#A9C6AA]" />
            </div>
            <span className="gb-mono text-[10px] tracking-[0.18em] text-[var(--gb-muted)]">
              GYENBOX.AUTH
            </span>
          </div>

          <div className="flex flex-1 flex-col p-8">
            <div className="flex items-center justify-between">
              <GyenBoxLogo showSubtitle markClassName="h-11 w-11" />
              <GyenBoxMark
                className="h-8 w-8 opacity-70"
                title="GyenBox secondary mark"
              />
            </div>

            <div className="mt-auto max-w-[360px]">
              <p className="gb-mono mb-4 text-[10px] font-bold tracking-[0.26em] text-[#5F74C4]">
                PRIVATE FILE TERRITORY
              </p>
              <h1 className="text-[34px] font-bold leading-[1.08] tracking-[-0.01em] text-[var(--gb-ink-deep)]">
                Files that feel calm, precise, and owned.
              </h1>
              <div className="mt-7 grid grid-cols-3 border-y border-[var(--gb-line)] text-center gb-mono text-[10px] tracking-[0.16em] text-[var(--gb-muted)]">
                <span className="border-r border-[var(--gb-line)] py-3">
                  FILES
                </span>
                <span className="border-r border-[var(--gb-line)] py-3">
                  LINKS
                </span>
                <span className="py-3">VAULT</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="mb-8 flex items-center justify-between md:hidden">
            <GyenBoxLogo showSubtitle markClassName="h-10 w-10" />
          </div>

          <div className="mb-7">
            <div className="mb-4 inline-flex items-center gap-2 border border-[#8896C6]/40 bg-[#E7EAF5] px-2.5 py-1 gb-mono text-[10px] font-bold tracking-[0.16em] text-[#4E63AF]">
              <ShieldCheck className="h-3.5 w-3.5" />
              {content.eyebrow}
            </div>
            <h2 className="text-2xl font-bold tracking-[-0.01em] text-[var(--gb-ink-deep)]">
              {content.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--gb-muted)]">
              {content.description}
            </p>
          </div>

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
                  className="h-11 rounded-[4px] border-[var(--gb-line-strong)] bg-white text-[var(--gb-ink)] placeholder:text-[var(--gb-faint)] focus-visible:ring-[#8896C6]"
                  required
                />
                <Input
                  label="Password"
                  name="password"
                  type="password"
                  placeholder={
                    mode === "login" ? "Enter password" : "Create password"
                  }
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 rounded-[4px] border-[var(--gb-line-strong)] bg-white text-[var(--gb-ink)] placeholder:text-[var(--gb-faint)] focus-visible:ring-[#8896C6]"
                  minLength={6}
                  required
                />
              </>
            ) : null}
            <Button
              className="h-11 rounded-[4px] bg-[var(--gb-ink)] text-[var(--gb-paper)] hover:bg-[#2A2A2A]"
              type="submit"
              disabled={isSubmitting}
            >
              <Mail className="h-4 w-4" />
              {isSubmitting ? "Working..." : content.action}
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-[4px] border-[var(--gb-line-strong)] bg-[var(--gb-paper-raised)] text-[var(--gb-ink)] hover:bg-[var(--gb-paper-muted)]"
              type="button"
              onClick={handleGithubLogin}
            >
              <Github className="h-4 w-4" />
              Continue with GitHub
            </Button>
          </form>

          {message ? (
            <p className="mt-4 border border-[var(--gb-line)] bg-[var(--gb-paper-muted)] px-3 py-2 text-sm text-[var(--gb-muted)]">
              {message}
            </p>
          ) : null}

          <Link
            href={linkedHref}
            className="mt-6 block text-center text-sm font-bold text-[#5F74C4] hover:text-[var(--gb-ink)]"
          >
            {content.linkLabel}
          </Link>
        </div>
      </section>
    </main>
  );
}

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//"))
    return "/workspace";
  return value;
}
