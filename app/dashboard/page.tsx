"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DEMO_QUOTA, DEMO_THREADS } from "@/lib/crew/demo-data";

type Thread = (typeof DEMO_THREADS)[number];
type CategoryFilter = "all" | Thread["category"];
type PriorityFilter = "all" | Thread["priority"];

interface LiveThread {
  id: string;
  subject: string | null;
  from_address: string | null;
  category: string | null;
  priority: string | null;
  status: string | null;
  created_at: string;
}

interface LiveState {
  status: "idle" | "loading" | "ok" | "unauthorized" | "not-configured" | "error";
  threads: LiveThread[];
  quota: { used: number; limit: number; plan: string } | null;
  message: string | null;
}

const CATEGORIES: Thread["category"][] = [
  "billing",
  "bug",
  "how-to",
  "pricing",
  "refund",
  "complaint",
  "pre-sales",
];

const PRIORITIES: Thread["priority"][] = ["P0", "P1", "P2", "P3"];

function ageText(createdAt: string): string {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return createdAt;
  const diffMs = Date.now() - created;
  const minutes = Math.max(0, Math.floor(diffMs / 60_000));
  if (minutes < 60) return `${minutes}m old`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h old`;
  const days = Math.floor(hours / 24);
  return `${days}d old`;
}

function priorityClass(priority: string | null): string {
  switch (priority) {
    case "P0":
      return "border-reject text-reject";
    case "P1":
      return "border-amber text-amber";
    case "P2":
      return "border-accent text-accent";
    case "P3":
    default:
      return "border-line text-muted";
  }
}

export default function DashboardPage() {
  const [tab, setTab] = useState<"live" | "demo">("demo");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [live, setLive] = useState<LiveState>({
    status: "idle",
    threads: [],
    quota: null,
    message: null,
  });

  // Live tab reads the user's real threads from Supabase (GET /api/threads).
  useEffect(() => {
    if (tab !== "live" || live.status !== "idle") return;
    let cancelled = false;
    setLive((s) => ({ ...s, status: "loading" }));
    fetch("/api/threads")
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          setLive({ status: "unauthorized", threads: [], quota: null, message: null });
          return;
        }
        if (res.status === 503) {
          setLive({ status: "not-configured", threads: [], quota: null, message: null });
          return;
        }
        const data = await res.json();
        if (!data.ok) {
          setLive({ status: "error", threads: [], quota: null, message: data.error ?? "Could not load live threads." });
          return;
        }
        setLive({
          status: "ok",
          threads: (data.threads ?? []) as LiveThread[],
          quota: data.quota ?? null,
          message: null,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setLive({ status: "error", threads: [], quota: null, message: "Could not reach the server." });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const filtered = useMemo(
    () =>
      DEMO_THREADS.filter(
        (t) =>
          (category === "all" || t.category === category) &&
          (priority === "all" || t.priority === priority),
      ),
    [category, priority],
  );

  const liveFiltered = useMemo(
    () =>
      live.threads.filter(
        (t) =>
          (category === "all" || t.category === category) &&
          (priority === "all" || t.priority === priority),
      ),
    [live.threads, category, priority],
  );

  const quotaUsed = live.quota?.used ?? DEMO_QUOTA.used;
  const quotaLimit = live.quota?.limit ?? DEMO_QUOTA.limit;

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-5">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold text-muted">
            <img src="/logo-96.png" alt="CrewDesk logo" className="h-5 w-5 rounded" />
            <Link href="/" className="inline-flex min-h-11 items-center hover:text-accent">
              CrewDesk
            </Link>
            {" · Support Crew"}
          </p>
          <h1 className="mt-1 text-3xl font-semibold">Inbox</h1>
          <p className="mt-1 text-sm text-muted">
            {tab === "live"
              ? "Your real inbox — threads from Supabase, never mixed with demo data."
              : "Demo data — not real customers. No customer counts or revenue are shown here."}
          </p>
        </div>
        <div className="rounded-md border border-line bg-panel px-3 py-2 text-right">
          <p className="text-xs text-muted">
            {live.quota ? `${live.quota.plan} plan quota` : "Free plan quota"}
          </p>
          <p className="text-lg font-semibold leading-tight">
            {quotaUsed} / {quotaLimit}
          </p>
          <p className="text-xs text-muted">replies per day, per sent reply</p>
        </div>
      </header>

      {/* F-5: the Knowledge base had no link from anywhere. */}
      <nav aria-label="Dashboard" className="mt-4 flex flex-wrap gap-5 text-sm">
        <Link
          href="/knowledge"
          className="inline-flex min-h-11 items-center text-accent hover:underline"
        >
          Knowledge base
        </Link>
        <Link
          href="/settings"
          className="inline-flex min-h-11 items-center text-muted hover:text-paper"
        >
          Settings
        </Link>
      </nav>

      <div className="mt-5 flex gap-2" role="tablist" aria-label="Inbox source">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "live"}
          onClick={() => setTab("live")}
          className={`inline-flex min-h-11 items-center rounded-full border px-4 py-1.5 text-sm font-medium ${
            tab === "live"
              ? "border-cta bg-cta text-void"
              : "border-line bg-panel text-paper hover:border-accent"
          }`}
        >
          Live{live.status === "ok" ? ` (${live.threads.length})` : ""}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "demo"}
          onClick={() => setTab("demo")}
          className={`inline-flex min-h-11 items-center rounded-full border px-4 py-1.5 text-sm font-medium ${
            tab === "demo"
              ? "border-cta bg-cta text-void"
              : "border-line bg-panel text-paper hover:border-accent"
          }`}
        >
          Demo ({DEMO_THREADS.length})
        </button>
      </div>

      {tab === "live" ? (
        <section className="mt-6">
          {live.status === "loading" || live.status === "idle" ? (
            <p className="rounded-lg border border-line bg-panel p-6 text-sm text-muted">
              Loading your live inbox…
            </p>
          ) : live.status === "unauthorized" ? (
            <div className="rounded-lg border border-line bg-panel p-6">
              <h2 className="text-xl font-semibold">Sign in to see your live inbox</h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
                Live threads belong to your account. Sign in with Google to
                see them — or explore the Demo tab without signing in.
              </p>
              <Link
                href="/login"
                className="mt-4 inline-flex min-h-11 items-center rounded-md bg-cta px-4 py-2 text-sm font-medium text-void hover:opacity-90"
              >
                Sign in
              </Link>
            </div>
          ) : live.status === "not-configured" ? (
            <div className="rounded-lg border border-line bg-panel p-6">
              <h2 className="text-xl font-semibold">Live inbox is not connected yet</h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
                Supabase is not configured on this deployment, so there are no
                live threads to show. The Demo tab still works.
              </p>
            </div>
          ) : live.status === "error" ? (
            <p className="rounded-lg border border-line bg-panel p-6 text-sm text-muted">
              Could not load live threads ({live.message}). Try again later.
            </p>
          ) : live.threads.length === 0 ? (
            <div className="rounded-lg border border-line bg-panel p-6">
              <h2 className="text-xl font-semibold">No real threads yet</h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
                No real threads yet — forward email to your inbound address
                (see Settings) and the crew will triage it here.
              </p>
              <Link
                href="/settings"
                className="mt-4 inline-flex min-h-11 items-center rounded-md bg-cta px-4 py-2 text-sm font-medium text-void hover:opacity-90"
              >
                Go to Settings
              </Link>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-muted">Category</span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as CategoryFilter)}
                    className="rounded-md border border-line bg-panel min-h-11 px-2 py-1.5 text-sm"
                  >
                    <option value="all">All categories</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-muted">Priority</span>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as PriorityFilter)}
                    className="rounded-md border border-line bg-panel min-h-11 px-2 py-1.5 text-sm"
                  >
                    <option value="all">All priorities</option>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="ml-auto self-center text-sm text-muted">
                  {liveFiltered.length} of {live.threads.length} live threads
                </p>
              </div>
              {liveFiltered.length === 0 ? (
                <p className="mt-6 rounded-lg border border-line bg-panel p-6 text-sm text-muted">
                  No live threads match these filters.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line bg-panel">
                  {liveFiltered.map((thread) => (
                    <li key={thread.id}>
                      <Link
                        href={`/inbox/${thread.id}`}
                        className="block px-4 py-4 hover:bg-panel-3"
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border bg-panel-2 px-2 py-0.5 text-xs font-semibold ${priorityClass(thread.priority)}`}
                          >
                            {thread.priority ?? "—"}
                          </span>
                          <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
                            {thread.category ?? "unclassified"}
                          </span>
                          <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
                            {thread.status}
                          </span>
                          <span
                            className="ml-auto text-xs text-muted"
                            suppressHydrationWarning
                          >
                            {ageText(thread.created_at)}
                          </span>
                        </span>
                        <span className="mt-2 block font-medium leading-snug">
                          {thread.subject ?? "(no subject)"}
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-muted">
                          {thread.from_address ?? ""}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      ) : (
        <section className="mt-6">
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted">Category</span>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as CategoryFilter)
                }
                className="rounded-md border border-line bg-panel min-h-11 px-2 py-1.5 text-sm"
              >
                <option value="all">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted">Priority</span>
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as PriorityFilter)
                }
                className="rounded-md border border-line bg-panel min-h-11 px-2 py-1.5 text-sm"
              >
                <option value="all">All priorities</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <p className="ml-auto self-center text-sm text-muted">
              {filtered.length} of {DEMO_THREADS.length} demo threads
            </p>
          </div>

          {filtered.length === 0 ? (
            <p className="mt-6 rounded-lg border border-line bg-panel p-6 text-sm text-muted">
              No demo threads match these filters.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line bg-panel">
              {filtered.map((thread) => (
                <li key={thread.id}>
                  <Link
                    href={`/inbox/${thread.id}`}
                    className="block px-4 py-4 hover:bg-panel-3"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border bg-panel-2 px-2 py-0.5 text-xs font-semibold ${priorityClass(thread.priority)}`}
                      >
                        {thread.priority}
                      </span>
                      <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
                        {thread.category}
                      </span>
                      <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
                        {thread.status}
                      </span>
                      <span
                        className="ml-auto text-xs text-muted"
                        suppressHydrationWarning
                      >
                        {ageText(thread.createdAt)}
                      </span>
                    </span>
                    <span className="mt-2 block font-medium leading-snug">
                      {thread.subject}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-muted">
                      {thread.from}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
