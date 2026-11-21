import Link from "next/link";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const showNotConfigured = error === "supabase_not_configured";

  return (
    <main className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <p className="flex items-center gap-2 text-xs font-semibold text-muted">
        <img src="/logo-96.png" alt="CrewDesk logo" className="h-5 w-5 rounded" />
        <Link href="/" className="inline-flex min-h-11 items-center hover:text-accent">
          CrewDesk
        </Link>
        {" · Support Crew"}
      </p>
      <h1 className="mt-2 text-3xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Demo data — not real customers. Sign-in is not live yet.
      </p>

      {showNotConfigured && (
        <div
          role="alert"
          className="mt-4 rounded-md border border-amber bg-panel px-4 py-3 text-sm"
        >
          Supabase is not configured yet — Google sign-in is unavailable.
          Explore the demo instead.
        </div>
      )}
      {error === "auth_failed" && (
        <div
          role="alert"
          className="mt-4 rounded-md border border-reject bg-panel px-4 py-3 text-sm"
        >
          Sign-in failed. Please try again or explore the demo.
        </div>
      )}

      <div className="mt-6 rounded-lg border border-line bg-panel p-6">
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
        <div className="mt-6 border-t border-line pt-5">
          <p className="text-sm text-muted">Or explore the demo dashboard:</p>
          <Link
            href="/dashboard"
            className="mt-2 inline-flex min-h-11 items-center rounded-md bg-cta px-4 py-2 text-sm font-medium text-void hover:opacity-90"
          >
            Explore the demo dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
