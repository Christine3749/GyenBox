"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { GyenBoxLogo } from "@/components/brand/gyenbox-logo";
import {
  getSupabaseBrowserClient,
  hasSupabaseBrowserConfig,
  setSupabaseBrowserConfig,
  type SupabaseBrowserConfig,
} from "@/lib/supabase-client";

type Props = {
  supabaseConfig?: SupabaseBrowserConfig | null;
};

type Status = "checking" | "signin" | "ready" | "opening" | "opened" | "error";

export function DesktopAuthorizeClient({ supabaseConfig }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const state = searchParams.get("state") ?? "";
  const deviceName = searchParams.get("deviceName") ?? "GyenBox Desktop";
  const appVersion = searchParams.get("appVersion") ?? "0.1.21";
  const currentPath = useMemo(
    () => `/desktop/authorize?${searchParams.toString()}`,
    [searchParams],
  );
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState("Checking your GyenBox session.");

  useEffect(() => {
    setSupabaseBrowserConfig(supabaseConfig ?? null);
  }, [supabaseConfig]);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      if (!state) {
        setStatus("error");
        setMessage("This desktop authorization link is missing a state token.");
        return;
      }

      if (!hasSupabaseBrowserConfig()) {
        setStatus("error");
        setMessage("Supabase login is not configured for this deployment.");
        return;
      }

      const { data } = await getSupabaseBrowserClient().auth.getSession();
      if (cancelled) return;

      if (!data.session) {
        setStatus("signin");
        setMessage("Redirecting you to sign in before connecting Desktop.");
        router.replace(`/login?next=${encodeURIComponent(currentPath)}`);
        return;
      }

      setSession(data.session);
      setStatus("ready");
      setMessage("Approve this desktop to sync with your GyenBox account.");
    }

    void checkSession();
    return () => {
      cancelled = true;
    };
  }, [currentPath, router, state]);

  function openDesktop() {
    if (!session) return;

    const callback = new URL("gyenbox://auth/callback");
    callback.searchParams.set("state", state);
    callback.searchParams.set("access_token", session.access_token);
    if (session.refresh_token)
      callback.searchParams.set("refresh_token", session.refresh_token);
    if (session.expires_at)
      callback.searchParams.set("expires_at", String(session.expires_at));
    if (session.user.email)
      callback.searchParams.set("email", session.user.email);

    setStatus("opening");
    setMessage("Opening GyenBox Desktop.");
    window.location.href = callback.toString();
    window.setTimeout(() => {
      setStatus("opened");
      setMessage("If Desktop did not open, click the button again.");
    }, 1600);
  }

  return (
    <main className="gb-paper-grid flex min-h-screen items-center justify-center px-6 py-10 text-[var(--gb-ink)]">
      <section className="w-full max-w-[520px] border border-[var(--gb-line-strong)] bg-[var(--gb-paper-raised)] p-8 shadow-[var(--gb-shadow)]">
        <div className="mb-8 flex items-center justify-between">
          <GyenBoxLogo showSubtitle markClassName="h-11 w-11" />
          <span className="gb-mono text-[10px] font-bold tracking-[0.18em] text-[#5F74C4]">
            DESKTOP LOGIN
          </span>
        </div>

        <div className="mb-7">
          <p className="gb-mono mb-3 text-[10px] font-bold tracking-[0.22em] text-[#5F74C4]">
            HALFSPHERE ACCOUNT
          </p>
          <h1 className="text-2xl font-bold tracking-[-0.01em] text-[var(--gb-ink-deep)]">
            Connect GyenBox Desktop
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--gb-muted)]">
            {message}
          </p>
        </div>

        <div className="mb-6 border border-[var(--gb-line)] bg-[var(--gb-paper-muted)] p-4 text-sm text-[var(--gb-muted)]">
          <div className="flex justify-between gap-4">
            <span>Device</span>
            <strong className="text-[var(--gb-ink)]">{deviceName}</strong>
          </div>
          <div className="mt-2 flex justify-between gap-4">
            <span>Version</span>
            <strong className="text-[var(--gb-ink)]">{appVersion}</strong>
          </div>
          {session?.user.email ? (
            <div className="mt-2 flex justify-between gap-4">
              <span>Account</span>
              <strong className="text-[var(--gb-ink)]">
                {session.user.email}
              </strong>
            </div>
          ) : null}
        </div>

        <Button
          className="h-11 w-full rounded-[4px] bg-[var(--gb-ink)] text-[var(--gb-paper)] hover:bg-[#2A2A2A]"
          type="button"
          onClick={openDesktop}
          disabled={status !== "ready" && status !== "opened"}
        >
          {status === "opening" ? "Opening..." : "Connect Desktop"}
        </Button>
      </section>
    </main>
  );
}
