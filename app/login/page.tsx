"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * Sign in. Google OAuth via Supabase Auth — ACTIVE only when the Supabase
 * env vars are present. The Google provider itself still needs Dony to
 * enable it in the Supabase dashboard (Client ID/Secret from his Google
 * Cloud Console); until then Supabase returns an auth error and this page
 * says so honestly instead of pretending sign-in works.
 */
function LoginForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    urlError === "supabase_not_configured"
      ? "Supabase is not configured yet — Google sign-in is unavailable. Explore the demo instead."
      : urlError === "auth_failed"
        ? "Sign-in failed. Please try again or explore the demo."
        : null,
  );
  const configured = isSupabaseConfigured();

  async function signInWithGoogle() {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Supabase is not configured yet.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      // Most likely cause: the Google provider is not enabled yet in the
      // Supabase dashboard (needs Dony's Google OAuth Client ID/Secret).
      setError(
        "Google sign-in is not enabled yet — the Google provider needs to be turned on in Supabase Auth (see Settings in the report).",
      );
      setBusy(false);
    }
  }

  async function signOut() {
    const supabase = getSupabaseBrowser();
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <p className="flex items-center gap-2 text-xs font-semibold text-muted">
        <img src="/logo-96.png" alt="CrewDesk logo" className="h-5 w-5 rounded" />
        <Link href="/" className="inline-flex min-h-11 items-center hover:text-accent">
          CrewDesk
        </Link>
        {" · Support Crew"}
      </p>
      <h1 className="mt-2 text-3xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Demo data — not real customers. Sign in with Google to use your own
        inbox, knowledge base, and quota.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-md border border-reject bg-panel px-4 py-3 text-sm"
        >
          {error}
        </div>
      )}

      <div className="mt-6 rounded-lg border border-line bg-panel p-6">
        {configured ? (
          <>
            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={busy}
              className="w-full min-h-11 rounded-md bg-cta px-4 py-2.5 text-sm font-medium text-void transition-transform duration-200 hover:-translate-y-px disabled:opacity-50 active:translate-y-0 active:scale-[0.98]"
            >
              {busy ? "Redirecting to Google…" : "Continue with Google"}
            </button>
            <p className="mt-3 text-sm text-muted">
              Google sign-in via Supabase Auth. If the Google provider is not
              enabled yet in the Supabase dashboard, this will fail honestly
              instead of pretending to work.
            </p>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled
              className="w-full min-h-11 cursor-not-allowed rounded-md border border-line bg-panel-2 px-4 py-2.5 text-sm font-medium text-muted opacity-60"
            >
              Continue with Google
            </button>
            <p className="mt-3 text-sm text-muted">
              Google OAuth needs a Supabase project — not connected yet.
            </p>
          </>
        )}
        <div className="mt-6 border-t border-line pt-5">
          <p className="text-sm text-muted">Or explore the demo dashboard:</p>
          <Link
            href="/dashboard"
            className="mt-2 inline-flex min-h-11 items-center rounded-md bg-cta px-4 py-2 text-sm font-medium text-void hover:opacity-90"
          >
            Explore the demo dashboard
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="mt-2 ml-3 inline-flex min-h-11 items-center text-sm text-muted hover:text-paper"
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
