"use client";

import { useState } from "react";

/**
 * WaitlistForm — Growth waitlist capture (F-3, decision A).
 * POST /api/upgrade-intent { plan: "growth", email } — the backend
 * accepts signed-out visitors and de-dups on (email, plan). The form
 * shows a real success state only when the API returns { ok: true };
 * failures show an honest error, never a fake "you're on the list".
 * No payment is taken here or anywhere on the waitlist.
 */
export default function WaitlistForm({ plan }: { plan: "growth" }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (status === "busy" || status === "done") return;
    setStatus("busy");
    setMessage(null);
    try {
      const res = await fetch("/api/upgrade-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, email }),
      });
      const data: {
        ok?: boolean;
        duplicate?: boolean;
        error?: string;
      } | null = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setStatus("error");
        setMessage(
          data?.error === "email must be a valid email address."
            ? "Enter a valid email address."
            : "Could not join the waitlist — please try again.",
        );
        return;
      }
      setStatus("done");
      setMessage(
        data?.duplicate
          ? "You're already on the list — we'll email you when Growth ships."
          : "You're on the list — we'll email you when Growth ships.",
      );
    } catch {
      setStatus("error");
      setMessage("Could not reach the server — please try again.");
    }
  }

  if (status === "done") {
    return (
      <p
        role="status"
        className="mt-6 rounded-xl border border-approve/40 bg-approve/10 px-4 py-3 text-sm font-medium text-approve"
      >
        {message}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6">
      <label
        htmlFor="growth-waitlist-email"
        className="text-sm font-medium text-paper"
      >
        Email for the waitlist
      </label>
      <input
        id="growth-waitlist-email"
        type="email"
        required
        maxLength={254}
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        disabled={status === "busy"}
        className="mt-2 w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-paper outline-none focus:border-accent disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={status === "busy" || email.trim() === ""}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center whitespace-nowrap rounded-full border border-line bg-panel px-5 text-sm font-semibold text-paper transition-transform duration-200 hover:-translate-y-px hover:border-accent active:translate-y-0 active:scale-[0.98] disabled:opacity-50"
      >
        {status === "busy" ? "Joining…" : "Join the waitlist"}
      </button>
      {status === "error" && message && (
        <p role="alert" className="mt-2 text-sm text-reject">
          {message}
        </p>
      )}
      <p className="mt-2 text-xs text-muted">
        No payment is taken. One email when Growth ships.
      </p>
    </form>
  );
}
