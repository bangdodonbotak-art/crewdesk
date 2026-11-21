"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { DEMO_THREADS } from "@/lib/crew/demo-data";

type Thread = (typeof DEMO_THREADS)[number];
type Status = Thread["status"];

const STEP_LABELS = ["Triage", "Reply", "Approve"] as const;

function stepIndexFor(status: string): number {
  switch (status) {
    case "received":
      return 0;
    case "triaged":
      return 1;
    case "drafted":
      return 2;
    case "awaiting_approval":
      return 2;
    case "sent":
      return 3;
    case "escalated":
      return 2;
    default:
      return 0;
  }
}

interface LiveThread {
  id: string;
  subject: string | null;
  from_address: string | null;
  body: string | null;
  category: string | null;
  priority: string | null;
  sentiment: number | null;
  status: string;
  draft_text: string | null;
  draft_source: string | null;
  created_at: string;
}

interface LiveStep {
  id: string;
  step: string;
  detail: string | null;
  actor: string | null;
  status: string;
  created_at: string;
}

export default function InboxDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const isDemo = id.startsWith("demo-");
  const demoThread = isDemo ? DEMO_THREADS.find((t) => t.id === id) : undefined;

  const [draft, setDraft] = useState(demoThread?.draft ?? "");
  const [localStatus, setLocalStatus] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [liveThread, setLiveThread] = useState<LiveThread | null>(null);
  const [liveSteps, setLiveSteps] = useState<LiveStep[]>([]);
  const [liveStatus, setLiveStatus] = useState<
    "idle" | "loading" | "ok" | "unauthorized" | "not-configured" | "error" | "not-found"
  >(isDemo ? "ok" : "idle");

  // Live threads: load from the DB via GET /api/threads/[id].
  useEffect(() => {
    if (isDemo) return;
    let cancelled = false;
    setLiveStatus("loading");
    fetch(`/api/threads/${id}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          setLiveStatus("unauthorized");
          return;
        }
        if (res.status === 503) {
          setLiveStatus("not-configured");
          return;
        }
        if (res.status === 404) {
          setLiveStatus("not-found");
          return;
        }
        const data = await res.json();
        if (!data.ok) {
          setLiveStatus("error");
          return;
        }
        setLiveThread(data.thread as LiveThread);
        setLiveSteps((data.steps ?? []) as LiveStep[]);
        setDraft((data.thread as LiveThread).draft_text ?? "");
        setLiveStatus("ok");
      })
      .catch(() => {
        if (!cancelled) setLiveStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [id, isDemo]);

  if (isDemo && !demoThread) {
    return (
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link href="/dashboard" className="inline-flex min-h-11 items-center text-sm text-accent hover:underline">
          ← Back to Inbox
        </Link>
        <h1 className="mt-4 text-3xl font-semibold">Thread not found (demo)</h1>
        <p className="mt-2 text-sm text-muted">
          Demo data — not real customers. No thread with id “{id}” exists in
          the demo data.
        </p>
      </main>
    );
  }

  if (!isDemo && liveStatus !== "ok") {
    return (
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link href="/dashboard" className="inline-flex min-h-11 items-center text-sm text-accent hover:underline">
          ← Back to Inbox
        </Link>
        {liveStatus === "loading" || liveStatus === "idle" ? (
          <p className="mt-4 text-sm text-muted">Loading thread…</p>
        ) : liveStatus === "unauthorized" ? (
          <>
            <h1 className="mt-4 text-3xl font-semibold">Sign in to see this thread</h1>
            <p className="mt-2 text-sm text-muted">
              Live threads belong to your account.{" "}
              <Link href="/login" className="text-accent hover:underline">Sign in</Link> to
              continue.
            </p>
          </>
        ) : liveStatus === "not-configured" ? (
          <>
            <h1 className="mt-4 text-3xl font-semibold">Live inbox is not connected yet</h1>
            <p className="mt-2 text-sm text-muted">
              Supabase is not configured on this deployment.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-3xl font-semibold">Thread not found</h1>
            <p className="mt-2 text-sm text-muted">
              No live thread with id “{id}” exists in your account.
            </p>
          </>
        )}
      </main>
    );
  }

  // Unified view model: demo thread or live thread, same rendering.
  const thread = isDemo
    ? {
        subject: demoThread!.subject,
        from: demoThread!.from,
        body: demoThread!.body,
        category: demoThread!.category,
        priority: demoThread!.priority,
        sentiment: demoThread!.sentiment,
        status: demoThread!.status as string,
        createdAt: demoThread!.createdAt,
        draftSource: "template",
      }
    : {
        subject: liveThread!.subject ?? "(no subject)",
        from: liveThread!.from_address ?? "",
        body: liveThread!.body ?? "",
        category: liveThread!.category ?? "unclassified",
        priority: liveThread!.priority ?? "—",
        sentiment: liveThread!.sentiment ?? 0,
        status: liveThread!.status,
        createdAt: liveThread!.created_at,
        draftSource: liveThread!.draft_source ?? "template",
      };

  const displayStatus = localStatus ?? thread.status;
  const doneSteps = stepIndexFor(thread.status);
  const isEscalated = thread.status === "escalated";
  const isSent = displayStatus === "sent" || displayStatus === "sent (demo)";

  async function callApprove(action: "approve" | "reject", editedDraft?: string) {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/crew/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: id, action, editedDraft }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (data.error === "quota_exceeded") {
          setNotice(
            `Daily quota reached (${data.quota?.used}/${data.quota?.limit} sent). Drafts and rejections cost nothing — try again tomorrow.`,
          );
        } else if (data.error === "unauthorized") {
          setNotice("Sign in first — live approvals need your account.");
        } else {
          setNotice(`Could not ${action} — ${data.error ?? `server returned ${res.status}`}.`);
        }
        return;
      }
      if (action === "approve") {
        setLocalStatus(isDemo ? "sent (demo)" : "sent");
        setNotice(
          isDemo
            ? "Sent — demo, no real email was sent."
            : "Approved to send — no real email is sent yet in this round (no sender credential wired). It counts as 1 sent reply against today's quota.",
        );
        if (!isDemo && liveThread) {
          setLiveThread({ ...liveThread, status: "sent" });
        }
      } else {
        setLocalStatus(isDemo ? "triaged (demo)" : "rejected");
        setNotice(
          isDemo
            ? "Draft rejected (demo) — thread returned to triage. No email was sent."
            : "Draft rejected — nothing sent, no quota used.",
        );
        if (!isDemo && liveThread) {
          setLiveThread({ ...liveThread, status: "rejected" });
        }
      }
    } catch {
      setNotice("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleApprove() {
    void callApprove("approve", draft);
  }

  function handleReject() {
    void callApprove("reject");
  }

  async function runCrewStep(step: "triage" | "draft") {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/crew/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: id, step }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setNotice(`Could not run ${step} — ${data.error ?? `server returned ${res.status}`}.`);
        return;
      }
      if (step === "triage") {
        const r = data.result as { category: string; priority: string };
        setNotice(`Triaged as ${r.category} / ${r.priority} (${data.source}).`);
        if (!isDemo && liveThread) {
          setLiveThread({
            ...liveThread,
            category: r.category,
            priority: r.priority,
            status: "triaged",
          });
        }
      } else {
        const r = data.result as { draft?: string; escalated?: boolean };
        if (r.escalated) {
          setNotice("Knowledge base has no answer — escalated to a human.");
          if (!isDemo && liveThread) setLiveThread({ ...liveThread, status: "escalated" });
        } else {
          setDraft(r.draft ?? "");
          setNotice(`Draft written (${data.source}). Review it below before approving.`);
          if (!isDemo && liveThread) {
            setLiveThread({ ...liveThread, draft_text: r.draft ?? "", status: "awaiting_approval" });
          }
        }
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
      <p className="mt-4 text-xs font-semibold text-muted">
        {isDemo ? "Demo data — not real customers" : "Live thread — your real inbox"}
      </p>

      {isEscalated && (
        <div
          role="alert"
          className="mt-3 rounded-md border border-amber bg-panel px-4 py-3 text-sm font-medium text-amber"
        >
          Escalated to founder — this thread needs a human decision before any
          reply is sent.
        </div>
      )}

      <h1 className="mt-3 text-3xl font-semibold leading-tight">
        {thread.subject}
      </h1>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full border border-accent px-2 py-0.5 text-xs font-semibold text-accent">
          {thread.priority}
        </span>
        <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
          {thread.category}
        </span>
        <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
          {displayStatus}
        </span>
        <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
          Sentiment: {thread.sentiment}
        </span>
        <span className="text-muted">From: {thread.from}</span>
      </div>

      <section className="mt-6 rounded-lg border border-line bg-panel p-5">
        <h2 className="text-lg font-semibold">Message</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
          {thread.body}
        </p>
        <p className="mt-3 text-xs text-muted">
          Received{" "}
          {new Date(thread.createdAt).toISOString().slice(0, 16).replace("T", " ")}{" "}
          UTC
        </p>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-panel p-5">
        <h2 className="text-lg font-semibold">Crew workflow</h2>
        <ol className="mt-3 space-y-2">
          {STEP_LABELS.map((label, i) => {
            const done = i < doneSteps;
            const current = i === doneSteps && !isSent;
            const state = isSent
              ? "Done"
              : isEscalated && i === 2
                ? "Escalated"
                : done
                  ? "Done"
                  : current
                    ? "In progress"
                    : "Pending";
            return (
              <li key={label} className="flex items-center gap-3 text-sm">
                <span
                  aria-hidden
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                    state === "Done"
                      ? "border-approve bg-approve text-void"
                      : state === "In progress"
                        ? "border-accent bg-accent text-void"
                        : state === "Escalated"
                          ? "border-amber bg-amber text-void"
                          : "border-line text-muted"
                  }`}
                >
                  {state === "Done" ? "✓" : i + 1}
                </span>
                <span className="font-medium">{label}</span>
                <span className="text-muted">{state}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-xs text-muted">
          Current status: {displayStatus}
        </p>
        {!isDemo && !isSent && (
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void runCrewStep("triage")}
              className="rounded-md min-h-11 border border-line bg-panel px-4 py-2 text-sm font-medium hover:border-accent disabled:opacity-50"
            >
              Run triage
            </button>
            <button
              type="button"
              disabled={busy || (thread.status !== "triaged" && thread.status !== "drafted")}
              onClick={() => void runCrewStep("draft")}
              className="rounded-md min-h-11 border border-line bg-panel px-4 py-2 text-sm font-medium hover:border-accent disabled:opacity-50"
            >
              Draft reply
            </button>
          </div>
        )}
        {!isDemo && liveSteps.length > 0 && (
          <div className="mt-4 border-t border-line pt-3">
            <h3 className="text-sm font-semibold">Audit log</h3>
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {liveSteps.map((s) => (
                <li key={s.id}>
                  {new Date(s.created_at).toISOString().slice(0, 16).replace("T", " ")} —{" "}
                  <span className="font-medium text-paper">{s.step}</span> ({s.status}):{" "}
                  {s.detail}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-line bg-panel p-5">
        <h2 className="text-lg font-semibold">Draft reply</h2>
        <p className="mt-1 text-xs text-muted">
          {isDemo
            ? "Demo draft — edit it below. Nothing is sent until you approve, and approval in demo mode sends nothing real."
            : `Draft source: ${thread.draftSource}. Nothing is sent until you approve.`}
        </p>
        <label htmlFor="draft" className="sr-only">
          Draft reply
        </label>
        <textarea
          id="draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={8}
          className="mt-3 w-full rounded-md border border-line bg-panel-2 px-3 py-2 text-sm leading-relaxed"
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleApprove}
            disabled={isSent || busy}
            className="rounded-md min-h-11 bg-cta px-4 py-2 text-sm font-medium text-void transition-transform duration-200 hover:-translate-y-px hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-0 active:scale-[0.98]"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={isSent || busy}
            className="rounded-md min-h-11 border border-line bg-panel px-4 py-2 text-sm font-medium transition-transform duration-150 hover:border-accent disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
          >
            Reject
          </button>
        </div>
        {notice && (
          <p role="status" className="mt-3 text-sm font-medium text-approve">
            {notice}
          </p>
        )}
      </section>
    </main>
  );
}
