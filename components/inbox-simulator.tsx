"use client";

import { useEffect, useRef, useState } from "react";
import { DEMO_NOTICE, PLANS } from "@/lib/site-data";
import CrewTimeline, { type CrewStep } from "./crew-timeline";

/**
 * InboxSimulator — the landing page's single interactive moment (DEMO).
 * Type or pick a sample customer message, watch the crew work through
 * Triage → Reply → Approve, then Approve, Edit, or Reject the draft.
 * Nothing here sends a real message. Everything is labelled DEMO.
 */

const STEPS: CrewStep[] = [
  {
    id: "triage",
    label: "Triage",
    description: "Demo: the crew reads the message and sorts it.",
  },
  {
    id: "reply",
    label: "Reply",
    description: "Demo: the crew drafts a reply for your review.",
  },
  {
    id: "approve",
    label: "Approve",
    description: "Demo: you decide. Nothing ships without your approval.",
  },
];

interface Example {
  id: string;
  label: string;
  customerMessage: string;
  draft: string;
}

const FREE_PLAN = PLANS.find((plan) => plan.id === "free");
const STARTER_PLAN = PLANS.find((plan) => plan.id === "starter");
const FREE_REPLIES = FREE_PLAN?.repliesPerDay ?? 5;
const STARTER_REPLIES = STARTER_PLAN?.repliesPerDay ?? 30;
const FREE_INBOXES = FREE_PLAN?.inboxes ?? 1;
const STARTER_INBOXES = STARTER_PLAN?.inboxes ?? 2;

const EXAMPLES: Example[] = [
  {
    id: "refund",
    label: "Refund request",
    customerMessage:
      "Hi, I was charged twice for my order #1042. Can I get a refund for the duplicate charge?",
    draft:
      "Hi — thanks for flagging this, and sorry for the double charge on order #1042. I've checked it and the duplicate payment is confirmed. A refund for the duplicate charge is on its way and should land in 3–5 business days. Let me know if it hasn't arrived by then.",
  },
  {
    id: "pricing",
    label: "Pricing question",
    customerMessage:
      "Hi! What's the difference between the Free plan and Starter? Is the free plan really free forever?",
    draft:
      `Hi! Yes — the Free plan is free forever, with ${FREE_REPLIES} replies a day and ${FREE_INBOXES} connected inbox. Starter is for busier inboxes: ${STARTER_REPLIES} replies a day and ${STARTER_INBOXES} connected inboxes. Both include the same rule: nothing is sent without your approval.`,
  },
  {
    id: "bug",
    label: "Bug report",
    customerMessage:
      "The dashboard won't load for me — I just get a blank page after signing in. I'm on Chrome on a Mac. Can you help?",
    draft:
      "Hi — sorry you're hitting a blank dashboard, that's frustrating. Could you try a hard refresh (Cmd + Shift + R) and let me know if it still happens? If it does, please share a screenshot and I'll escalate this to the team right away.",
  },
];

type Stage = "idle" | "working" | "review" | "editing" | "sent" | "rejected";

export default function InboxSimulator() {
  const [exampleId, setExampleId] = useState<string>(EXAMPLES[0].id);
  const [customerMessage, setCustomerMessage] = useState<string>(
    EXAMPLES[0].customerMessage,
  );
  const [draft, setDraft] = useState<string>(EXAMPLES[0].draft);
  const [stage, setStage] = useState<Stage>("idle");
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((t) => clearTimeout(t));
    };
  }, []);

  const pickExample = (example: Example) => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
    setExampleId(example.id);
    setCustomerMessage(example.customerMessage);
    setDraft(example.draft);
    setStage("idle");
    setCurrentStep(-1);
  };

  const runCrew = () => {
    if (customerMessage.trim().length === 0) return;
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
    setStage("working");
    setCurrentStep(0);
    // Simple sequential reveal: opacity/transform only, via CrewTimeline
    // state + the step panels below. Timers are cleared on unmount/reset.
    timers.current = [
      setTimeout(() => setCurrentStep(1), 900),
      setTimeout(() => setCurrentStep(2), 1800),
      setTimeout(() => setStage("review"), 2600),
    ];
  };

  const reset = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
    setStage("idle");
    setCurrentStep(-1);
  };

  const statusLabel =
    stage === "sent"
      ? "Sent (demo)"
      : stage === "rejected"
        ? "Rejected (demo)"
        : stage === "review"
          ? "Waiting for your approval (demo)"
          : stage === "editing"
            ? "Editing draft (demo)"
            : stage === "working"
              ? "Crew working (demo)"
              : "Not started (demo)";

  const statusClass =
    stage === "sent"
      ? "border-green bg-green/10 text-green"
      : stage === "rejected"
        ? "border-red bg-red/10 text-red"
        : "border-amber bg-amber/10 text-amber";

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Try it — interactive demo
          </p>
          <h3 className="mt-2 font-display text-2xl font-semibold">
            Watch the crew handle one message
          </h3>
        </div>
        <span className="rounded-full border border-line bg-paper px-3 py-1 text-xs font-medium text-muted">
          {DEMO_NOTICE}
        </span>
      </div>

      {/* Example picker */}
      <div className="mt-5">
        <p className="text-sm font-medium text-ink">Pick a sample message:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example.id}
              type="button"
              onClick={() => pickExample(example)}
              aria-pressed={exampleId === example.id}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                exampleId === example.id
                  ? "border-accent bg-accent text-white"
                  : "border-line bg-paper text-ink hover:border-accent"
              }`}
            >
              {example.label}
            </button>
          ))}
        </div>
      </div>

      {/* Customer message */}
      <label
        htmlFor="demo-customer-message"
        className="mt-5 block text-sm font-medium text-ink"
      >
        Customer message (demo)
      </label>
      <textarea
        id="demo-customer-message"
        value={customerMessage}
        onChange={(event) => {
          setCustomerMessage(event.target.value);
          setExampleId("custom");
          if (stage !== "idle") reset();
        }}
        rows={3}
        className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm leading-relaxed text-ink outline-none focus:border-accent"
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runCrew}
          disabled={stage === "working" || customerMessage.trim().length === 0}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {stage === "working" ? "Crew working…" : "Let the crew work"}
        </button>
        {(stage === "review" ||
          stage === "editing" ||
          stage === "sent" ||
          stage === "rejected") && (
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-medium text-ink"
          >
            Try another message
          </button>
        )}
        <span
          aria-live="polite"
          className={`rounded-full border px-3 py-1 text-xs font-medium ${statusClass}`}
        >
          {statusLabel}
        </span>
      </div>

      {/* Crew steps — revealed in sequence */}
      {(stage === "working" || stage === "review" || stage === "editing" || stage === "sent" || stage === "rejected") && (
        <div className="mt-6 border-t border-line pt-6">
          <CrewTimeline
            steps={STEPS}
            currentStep={stage === "sent" || stage === "rejected" ? 2 : currentStep}
          />
          <p className="mt-2 text-xs text-muted">
            {stage === "working"
              ? "Demo: the crew is working through each step."
              : "Demo: all three steps are complete. The draft below is waiting for you."}
          </p>
        </div>
      )}

      {/* Draft + decision */}
      {(stage === "review" || stage === "editing") && (
        <div className="mt-6 rounded-xl border border-line bg-paper p-4">
          <p className="text-sm font-medium text-ink">
            Draft reply (demo — not sent yet)
          </p>
          {stage === "editing" ? (
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={5}
              aria-label="Edit draft reply (demo)"
              className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm leading-relaxed text-ink outline-none focus:border-accent"
            />
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-ink">{draft}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {stage === "editing" ? (
              <button
                type="button"
                onClick={() => setStage("review")}
                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
              >
                Save edit
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStage("sent")}
                  className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => setStage("editing")}
                  className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setStage("rejected")}
                  className="rounded-full border border-red/40 bg-white px-4 py-2 text-sm font-medium text-red"
                >
                  Reject
                </button>
              </>
            )}
          </div>
          <p className="mt-3 text-xs text-muted">
            Demo: Approve, Edit, or Reject — the founder decides. Nothing is
            sent until you approve.
          </p>
        </div>
      )}

      {stage === "sent" && (
        <div
          aria-live="polite"
          className="mt-6 rounded-xl border border-green/40 bg-green/10 p-4"
        >
          <p className="font-medium text-green">Sent (demo)</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">{draft}</p>
          <p className="mt-2 text-xs text-muted">
            {DEMO_NOTICE} — in the real product this reply would now go to the
            customer, and it would count as 1 sent reply against your daily
            quota.
          </p>
        </div>
      )}

      {stage === "rejected" && (
        <div
          aria-live="polite"
          className="mt-6 rounded-xl border border-red/40 bg-red/10 p-4"
        >
          <p className="font-medium text-red">Rejected (demo)</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">
            This draft was rejected. Nothing was sent, and no quota was used —
            quota counts only per reply actually sent.
          </p>
        </div>
      )}
    </div>
  );
}
