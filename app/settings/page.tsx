"use client";

import { useState } from "react";
import Link from "next/link";
import { FREE_DAILY_LIMIT, PLANS } from "@/lib/site-data";

/*
 * PLANS shape is owned by lib/site-data.ts (another crew member's file).
 * Read it defensively so this page keeps working whatever exact fields
 * that file declares — no price is written here, only displayed from PLANS.
 */
type PlanView = {
  id: string;
  name: string;
  price?: number | string | null;
  tagline?: string;
};

const plans = PLANS as unknown as PlanView[];
const freePlan =
  plans.find(
    (p) => p.id === "free" || p.name.toLowerCase().includes("free"),
  ) ?? plans[0];

function planPriceText(plan: PlanView | undefined): string {
  if (!plan || plan.price === undefined || plan.price === null) return "";
  if (typeof plan.price === "number") {
    return plan.price === 0 ? "$0" : `$${plan.price}`;
  }
  return plan.price;
}

export default function SettingsPage() {
  const [intentResult, setIntentResult] = useState<string | null>(null);
  const [intentBusy, setIntentBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);

  const inboundAddress =
    process.env.NEXT_PUBLIC_CREWDESK_INBOUND_ADDRESS ??
    "inbox@inbound.crewdesk.example";

  async function recordUpgradeIntent() {
    setIntentBusy(true);
    setIntentResult(null);
    try {
      const res = await fetch("/api/upgrade-intent", { method: "POST" });
      if (!res.ok) {
        setIntentResult(
          `Could not record — the upgrade-intent endpoint returned ${res.status}. (Demo)`,
        );
        return;
      }
      setIntentResult("Recorded (demo)");
    } catch {
      setIntentResult(
        "Could not record — the upgrade-intent endpoint is not reachable yet. (Demo)",
      );
    } finally {
      setIntentBusy(false);
    }
  }

  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/dashboard" className="inline-flex min-h-11 items-center text-sm text-accent hover:underline">
        ← Back to Inbox
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-muted">
        Demo data — not real customers.
      </p>

      <section className="mt-6 rounded-lg border border-line bg-panel p-5">
        <h2 className="text-lg font-semibold">Plan</h2>
        {freePlan ? (
          <p className="mt-2 text-sm leading-relaxed">
            Current plan:{" "}
            <span className="font-semibold">{freePlan.name}</span>
            {planPriceText(freePlan) && (
              <> — {planPriceText(freePlan)}/mo</>
            )}
            {freePlan.tagline && (
              <span className="block text-muted">{freePlan.tagline}</span>
            )}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted">
            Current plan: Free (no plan data found in PLANS).
          </p>
        )}
        <p className="mt-2 text-sm text-muted">
          Free quota: {FREE_DAILY_LIMIT} replies per day, forever.
        </p>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-panel p-5">
        <h2 className="text-lg font-semibold">Inbound email</h2>
        <p className="mt-2 text-sm leading-relaxed">
          Forward email to your inbound address:
        </p>
        <p className="mt-2 rounded-md border border-line bg-panel-2 px-3 py-2 font-mono text-sm">
          {inboundAddress}
        </p>
        <p className="mt-2 text-sm text-muted">
          Set NEXT_PUBLIC_CREWDESK_INBOUND_ADDRESS in .env.local (and in
          Vercel) to change this address.
        </p>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-panel p-5">
        <h2 className="text-lg font-semibold">Gmail</h2>
        <p className="mt-2 text-sm text-muted">
          Google OAuth scaffolding only — Supabase project not created yet.
        </p>
        <button
          type="button"
          disabled
          className="mt-3 min-h-11 cursor-not-allowed rounded-md border border-line bg-panel-2 px-4 py-2 text-sm font-medium text-muted opacity-60"
        >
          Connect Gmail
        </button>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-panel p-5">
        <h2 className="text-lg font-semibold">Upgrade</h2>
        <p className="mt-2 text-sm text-muted">
          Thinking about a paid plan? Recording your intent helps us know what
          founders actually want. No charge, no real data leaves this demo.
        </p>
        <button
          type="button"
          onClick={recordUpgradeIntent}
          disabled={intentBusy}
          className="mt-3 min-h-11 rounded-md bg-cta px-4 py-2 text-sm font-medium text-void hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {intentBusy ? "Recording…" : "Record upgrade intent"}
        </button>
        {intentResult && (
          <p role="status" className="mt-3 text-sm font-medium text-approve">
            {intentResult}
          </p>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-line bg-panel p-5">
        <h2 className="text-lg font-semibold">Demo data</h2>
        <p className="mt-2 text-sm text-muted">
          Demo only — this clears the demo view in this browser. No real data
          exists to delete.
        </p>
        {!confirmClear ? (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="mt-3 min-h-11 rounded-md border border-reject px-4 py-2 text-sm font-medium text-reject hover:bg-panel-3"
          >
            Clear demo data
          </button>
        ) : !cleared ? (
          <div className="mt-3 rounded-md border border-line bg-panel-2 px-3 py-3 text-sm">
            <p>
              Are you sure? This only clears the demo view in this browser.
              Demo only — nothing real is affected.
            </p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => setCleared(true)}
                className="rounded-md min-h-11 bg-cta px-4 py-2 text-sm font-medium text-void hover:opacity-90"
              >
                Yes, clear demo data
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="rounded-md min-h-11 border border-line bg-panel px-4 py-2 text-sm font-medium hover:border-accent"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p role="status" className="mt-3 text-sm font-medium text-approve">
            Demo data cleared from this view (demo only).
          </p>
        )}
      </section>
    </main>
  );
}
