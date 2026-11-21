"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FREE_DAILY_LIMIT, PLANS } from "@/lib/site-data";

/*
 * PLANS shape is owned by lib/site-data.ts (another crew member's file).
 * Read it defensively so this page keeps working whatever exact fields
 * that file declares — no price is written here, only displayed from PLANS.
 */
function planReplies(plan: (typeof PLANS)[number]): number {
  const p = plan as unknown as Record<string, unknown>;
  return typeof p.repliesPerDay === "number"
    ? p.repliesPerDay
    : typeof p.replies === "number"
      ? p.replies
      : typeof p.dailyLimit === "number"
        ? p.dailyLimit
        : 5;
}

function planPrice(plan: (typeof PLANS)[number]): string {
  const p = plan as unknown as Record<string, unknown>;
  return typeof p.price === "string"
    ? p.price
    : typeof p.priceUsd === "number"
      ? `$${p.priceUsd}/mo`
      : typeof p.price === "number"
        ? `$${p.price}/mo`
        : "";
}

interface SettingsState {
  status: "loading" | "ok" | "not-configured" | "error";
  signedIn: boolean;
  configured: boolean;
  plan: string;
  quotaUsed: number;
  quotaLimit: number;
  inboundAddress: string;
  hasInboundToken: boolean;
  dataConsent: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>({
    status: "loading",
    signedIn: false,
    configured: false,
    plan: "Free",
    quotaUsed: 0,
    quotaLimit: FREE_DAILY_LIMIT,
    inboundAddress: "inbox@inbound.crewdesk.example",
    hasInboundToken: false,
    dataConsent: false,
  });
  const [upgradePlan, setUpgradePlan] = useState<"starter" | "growth">("starter");
  const [upgradeSent, setUpgradeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [tokenNotice, setTokenNotice] = useState<string | null>(null);
  const [tokenValue, setTokenValue] = useState<string | null>(null);

  // GET /api/settings — plan, quota, inbound address/token state, consent.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then(async (res) => {
        if (cancelled) return;
        const data = await res.json();
        if (!data.ok) {
          setSettings((s) => ({ ...s, status: "error" }));
          return;
        }
        setSettings({
          status: "ok",
          signedIn: Boolean(data.signedIn),
          configured: Boolean(data.configured),
          plan: data.plan ?? "Free",
          quotaUsed: data.quotaUsed ?? 0,
          quotaLimit: data.quotaLimit ?? FREE_DAILY_LIMIT,
          inboundAddress: data.inboundAddress ?? "inbox@inbound.crewdesk.example",
          hasInboundToken: Boolean(data.hasInboundToken),
          dataConsent: Boolean(data.dataConsent),
        });
      })
      .catch(() => {
        if (!cancelled) setSettings((s) => ({ ...s, status: "error" }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleUpgrade(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/upgrade-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: upgradePlan }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setUpgradeSent(true);
      } else {
        setNotice(`Could not save your upgrade request — ${data.error ?? `server returned ${res.status}`}.`);
      }
    } catch {
      setNotice("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRotateToken() {
    setBusy(true);
    setTokenValue(null);
    setTokenNotice(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rotate-token" }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setTokenValue(data.token);
        setTokenNotice("Token created — copy it now, it is shown only once.");
        setSettings((s) => ({ ...s, hasInboundToken: true }));
      } else {
        setTokenNotice(`Could not create a token — ${data.error ?? `server returned ${res.status}`}.`);
      }
    } catch {
      setTokenNotice("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleConsent(consent: boolean) {
    setBusy(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-consent", consent }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSettings((s) => ({ ...s, dataConsent: consent }));
      } else {
        setNotice(`Could not save consent — ${data.error ?? `server returned ${res.status}`}.`);
      }
    } catch {
      setNotice("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleClearDemo() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/threads/demo", { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.ok) {
        setNotice(`Demo data cleared — ${data.deleted} demo thread(s) removed from your account.`);
      } else {
        setNotice(`Could not clear demo data — ${data.error ?? `server returned ${res.status}`}.`);
      }
    } catch {
      setNotice("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/dashboard" className="inline-flex min-h-11 items-center text-sm text-accent hover:underline">
        ← Back to Inbox
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-muted">
        Plan, quota, inbound email, and data consent. Nothing here is sent
        anywhere without your action.
      </p>
      {settings.status === "loading" ? (
        <p className="mt-2 rounded-md border border-line bg-panel px-3 py-2 text-sm text-muted">
          Loading your settings…
        </p>
      ) : settings.status === "not-configured" || settings.status === "error" ? (
        <p className="mt-2 rounded-md border border-line bg-panel px-3 py-2 text-sm text-muted">
          Live settings are not connected on this deployment — the plan and
          quota below are the published values from the site data.
        </p>
      ) : !settings.signedIn ? (
        <p className="mt-2 rounded-md border border-line bg-panel px-3 py-2 text-sm text-muted">
          You are signed out — showing the published plan values.{" "}
          <Link href="/login" className="text-accent hover:underline">Sign in</Link> to see your
          own plan, quota, and inbound token.
        </p>
      ) : null}
      {notice && (
        <p role="status" className="mt-2 rounded-md border border-line bg-panel px-3 py-2 text-sm font-medium text-approve">
          {notice}
        </p>
      )}

      <section className="mt-6 rounded-lg border border-line bg-panel p-5">
        <h2 className="text-lg font-semibold">Plan and daily quota</h2>
        <p className="mt-2 text-sm text-muted">
          Current plan:{" "}
          <span className="font-medium text-paper">
            {settings.plan.charAt(0).toUpperCase() + settings.plan.slice(1)}
          </span>{" "}—{" "}
          {settings.quotaUsed} of {settings.quotaLimit} replies sent today.
          Quota is counted on the server, per sent reply, and resets daily.
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {PLANS.map((plan) => (
            <li key={plan.name} className="flex items-baseline gap-2">
              <span className="font-medium">{plan.name}</span>
              <span className="text-muted">
                {planReplies(plan)} replies/day
                {planPrice(plan) ? ` · ${planPrice(plan)}` : ""}
              </span>
            </li>
          ))}
        </ul>

        <form onSubmit={handleUpgrade} className="mt-4 border-t border-line pt-4">
          <h3 className="font-medium">Request an upgrade</h3>
          <p className="mt-1 text-sm text-muted">
            No card is charged here. Your request is recorded and the founder
            follows up manually — checkout (Stripe) is not wired yet.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted">Plan</span>
              <select
                value={upgradePlan}
                onChange={(e) =>
                  setUpgradePlan(e.target.value as "starter" | "growth")
                }
                className="rounded-md border border-line bg-panel min-h-11 px-2 py-1.5 text-sm"
              >
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={upgradeSent || busy}
              className="rounded-md min-h-11 bg-cta px-4 py-2 text-sm font-medium text-void hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {upgradeSent ? "Request recorded ✓" : "Request upgrade"}
            </button>
          </div>
          {upgradeSent && (
            <p className="mt-2 text-sm text-approve">
              Recorded — the founder will follow up with payment details.
            </p>
          )}
        </form>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-panel p-5">
        <h2 className="text-lg font-semibold">Inbound email</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Your support inbox forwards email to your crew address and the crew
          triages it automatically. CrewDesk does not read your Gmail —
          forward-to plus a per-user secret token only.
        </p>
        <div className="mt-3 rounded-md bg-panel-2 px-3 py-2 text-sm">
          <span className="text-muted">Forward emails to: </span>
          <code>{settings.inboundAddress}</code>
        </div>
        {settings.signedIn ? (
          <>
            <p className="mt-2 text-sm text-muted">
              Inbound token:{" "}
              {settings.hasInboundToken ? (
                <span className="font-medium text-paper">set ✓</span>
              ) : (
                <span className="font-medium text-paper">not set yet</span>
              )}
            </p>
            <button
              type="button"
              onClick={() => void handleRotateToken()}
              disabled={busy}
              className="mt-3 rounded-md min-h-11 border border-line bg-panel px-4 py-2 text-sm font-medium hover:border-accent disabled:opacity-50"
            >
              {settings.hasInboundToken ? "Rotate inbound token" : "Generate inbound token"}
            </button>
            {tokenNotice && (
              <p role="status" className="mt-2 text-sm font-medium text-approve">{tokenNotice}</p>
            )}
            {tokenValue && (
              <div className="mt-2 rounded-md bg-panel-2 px-3 py-2">
                <p className="text-xs text-muted">
                  Your inbound token (shown once — never stored in the browser):
                </p>
                <code className="break-all text-sm">{tokenValue}</code>
              </div>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">
            Sign in to generate your per-user inbound token.
          </p>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-line bg-panel p-5">
        <h2 className="text-lg font-semibold">Data consent</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Live triage sends the customer email to the free model provider
          (TokenHarbor DeepSeek, server-side). Turn this on only when you
          accept that.
        </p>
        <label className="mt-3 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.dataConsent}
            disabled={!settings.signedIn || busy}
            onChange={(e) => void handleConsent(e.target.checked)}
            className="mt-0.5 h-5 w-5"
          />
          <span>
            I consent to sending customer email content to the model provider
            for triage and drafting.
          </span>
        </label>
        {!settings.signedIn && (
          <p className="mt-2 text-xs text-muted">Sign in to change consent.</p>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-line bg-panel p-5">
        <h2 className="text-lg font-semibold">Demo data</h2>
        <p className="mt-2 text-sm text-muted">
          Remove any demo threads you created in your own account. The built-in
          sample data on the Dashboard Demo tab is static and cannot be
          deleted — this only removes demo threads stored in your account.
        </p>
        <button
          type="button"
          onClick={() => void handleClearDemo()}
          disabled={!settings.signedIn || busy}
          className="mt-3 rounded-md min-h-11 border border-line bg-panel px-4 py-2 text-sm font-medium hover:border-accent disabled:opacity-50"
        >
          Clear my demo data
        </button>
      </section>
    </main>
  );
}
