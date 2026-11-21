"use client";

import { use, useState } from "react";
import Link from "next/link";
import { DEMO_THREADS } from "@/lib/crew/demo-data";

type Thread = (typeof DEMO_THREADS)[number];
type Status = Thread["status"];

const STEP_LABELS = ["Triage", "Reply", "Approve"] as const;

function stepIndexFor(status: Status): number {
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

export default function InboxDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const thread = DEMO_THREADS.find((t) => t.id === id);

  const [draft, setDraft] = useState(thread?.draft ?? "");
  const [localStatus, setLocalStatus] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!thread) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
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

  const displayStatus = localStatus ?? thread.status;
  const doneSteps = stepIndexFor(thread.status);
  const isEscalated = thread.status === "escalated";
  const isSent = displayStatus === "sent (demo)";

  function handleApprove() {
    setLocalStatus("sent (demo)");
    setNotice("Sent — demo, no real email was sent.");
  }

  function handleReject() {
    setLocalStatus("triaged (demo)");
    setNotice(
      "Draft rejected (demo) — thread returned to triage. No email was sent.",
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/dashboard" className="inline-flex min-h-11 items-center text-sm text-accent hover:underline">
        ← Back to Inbox
      </Link>
      <p className="mt-4 text-xs font-semibold text-muted">
        Demo data — not real customers
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
          {thread.status}
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
      </section>

      <section className="mt-6 rounded-lg border border-line bg-panel p-5">
        <h2 className="text-lg font-semibold">Draft reply</h2>
        <p className="mt-1 text-xs text-muted">
          Demo draft — edit it below. Nothing is sent until you approve, and
          approval in demo mode sends nothing real.
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
            disabled={isSent}
            className="rounded-md min-h-11 bg-cta px-4 py-2 text-sm font-medium text-void hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={isSent}
            className="rounded-md min-h-11 border border-line bg-panel px-4 py-2 text-sm font-medium hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
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
