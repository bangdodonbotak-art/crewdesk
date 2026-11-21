"use client";

import { useEffect, useRef, useState } from "react";
import { DEMO_NOTICE, PLANS } from "@/lib/site-data";

/**
 * InboxSimulator — the landing page's single interactive moment (DEMO).
 * Type or pick a sample customer message, watch the crew work through
 * Triage → Reply → Approve, then Approve, Edit, or Reject the draft.
 * Nothing here sends a real message. Everything is labelled DEMO.
 *
 * Auto-play: on mount (no-preference only) it runs ONE ambient cycle
 * Triage → Reply → Approve (~2.75s per step, typing indicator + progress
 * bar), then stops at the review state with a Replay button. It never
 * loops. Pause button (≥44px) + pause on hover/focus. Any manual
 * interaction stops auto-play. In prefers-reduced-motion it shows a
 * static review frame + manual controls only.
 */

export interface CrewStep {
  id: string;
  label: string;
  description: string;
}

export const STEPS: CrewStep[] = [
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

const STEP_MS = 2750;

export default function InboxSimulator() {
  const [exampleId, setExampleId] = useState<string>(EXAMPLES[0].id);
  const [customerMessage, setCustomerMessage] = useState<string>(
    EXAMPLES[0].customerMessage,
  );
  const [draft, setDraft] = useState<string>(EXAMPLES[0].draft);
  const [stage, setStage] = useState<Stage>("idle");
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [running, setRunning] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  const [autoDone, setAutoDone] = useState(false);
  const [manualPaused, setManualPaused] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [outOfViewPaused, setOutOfViewPaused] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [draftShown, setDraftShown] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevInViewRef = useRef(false);
  const paused = manualPaused || hoverPaused || outOfViewPaused;

  // Mount: one ambient auto-play cycle — or a static review frame when the
  // user prefers reduced motion.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setReducedMotion(true);
      setStage("review");
      setCurrentStep(STEPS.length - 1);
      return;
    }
    setStage("working");
    setCurrentStep(0);
    setRunning(true);
    setIsAuto(true);
  }, []);

  // Viewport behaviour: restart the ambient cycle when the simulator
  // scrolls back into view (only if the user never touched a control),
  // auto-pause while it is out of view. Reduced-motion never restarts.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const inView = entries[0].isIntersecting;
        setOutOfViewPaused(!inView);
        // Restart ONLY on a real out-of-view → in-view transition.
        // (The observer fires once on observe() with the current state;
        // without the prev-check the restart would re-trigger itself
        // every time the effect re-ran after a cycle finished.)
        const wasOut = !prevInViewRef.current;
        prevInViewRef.current = inView;
        if (
          inView &&
          wasOut &&
          autoDone &&
          !userInteracted &&
          !reducedMotion &&
          stage === "review"
        ) {
          setAutoDone(false);
          setStage("working");
          setCurrentStep(0);
          setRunning(true);
          setIsAuto(true);
        }
      },
      // NOTE: threshold is 0, not 0.3 — the simulator card is taller than
      // the viewport space left below the hero at load (1280x800 shows
      // only ~7% of it), so 0.3 would report "out of view" on load and
      // pause the ambient autoplay before it ever ran. Any visible pixel
      // counts as "in view"; fully scrolled past still auto-pauses.
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [autoDone, userInteracted, reducedMotion, stage]);

  // Draft panel entrance: fade + rise when the review stage arrives.
  useEffect(() => {
    if (stage === "review" || stage === "editing") {
      const raf = requestAnimationFrame(() => setDraftShown(true));
      return () => cancelAnimationFrame(raf);
    }
    setDraftShown(false);
  }, [stage]);

  // Step engine: advance one step per STEP_MS while a run is in progress
  // and not paused. Finishing the last step lands on review and stops —
  // auto-play never loops.
  useEffect(() => {
    if (!running || paused || stage !== "working") return;
    const timer = setTimeout(() => {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep((s) => s + 1);
      } else {
        setStage("review");
        setRunning(false);
        if (isAuto) {
          setAutoDone(true);
          setIsAuto(false);
        }
      }
    }, STEP_MS);
    return () => clearTimeout(timer);
  }, [running, paused, currentStep, stage, isAuto]);

  const stopAmbient = () => {
    setRunning(false);
    setIsAuto(false);
    setAutoDone(false);
    setManualPaused(false);
    setUserInteracted(true);
  };

  const pickExample = (example: Example) => {
    stopAmbient();
    setExampleId(example.id);
    setCustomerMessage(example.customerMessage);
    setDraft(example.draft);
    setStage("idle");
    setCurrentStep(-1);
  };

  const runCrew = () => {
    if (customerMessage.trim().length === 0) return;
    stopAmbient();
    setStage("working");
    setCurrentStep(0);
    setRunning(true);
  };

  const replay = () => {
    setUserInteracted(true);
    setAutoDone(false);
    setManualPaused(false);
    setStage("working");
    setCurrentStep(0);
    setRunning(true);
    setIsAuto(true);
  };

  const reset = () => {
    stopAmbient();
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
      ? "border-approve bg-approve/10 text-approve"
      : stage === "rejected"
        ? "border-reject bg-reject/10 text-reject"
        : "border-amber bg-amber/10 text-amber";

  const allStepsDone =
    stage === "review" ||
    stage === "editing" ||
    stage === "sent" ||
    stage === "rejected";

  const progress =
    stage === "idle"
      ? 0
      : stage === "working"
        ? (currentStep + 1) / STEPS.length
        : 1;

  return (
    <div
      ref={containerRef}
      className="rounded-xl border border-line bg-panel p-5 shadow-sm sm:p-6"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onFocus={() => setHoverPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setHoverPaused(false);
        }
      }}
    >
      {/* Terminal header bar */}
      <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
        <p className="truncate font-mono text-xs text-muted">
          crewdesk — live demo
        </p>
        <span className="flex shrink-0 items-center gap-2 whitespace-nowrap font-mono text-xs font-medium text-accent">
          <span
            aria-hidden="true"
            className="h-2 w-2 animate-pulse rounded-full bg-accent"
          />
          LIVE
        </span>
      </div>
      {/* Progress bar — scaleX from the left, no layout animation */}
      <div
        className="mt-4 h-1 overflow-hidden rounded-full bg-panel-3"
        aria-hidden="true"
      >
        <div
          className="h-full w-full origin-left bg-accent transition-transform duration-500 ease-out"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
      <p className="mt-2 text-xs text-meta" aria-live="polite">
        {stage === "working"
          ? `Step ${currentStep + 1} of ${STEPS.length} — ${STEPS[Math.max(0, currentStep)].label}`
          : stage === "idle"
            ? "Not started yet"
            : `Step ${STEPS.length} of ${STEPS.length} — ${STEPS[STEPS.length - 1].label}`}
      </p>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-balance font-display text-2xl font-semibold">
          Watch the crew handle one message
        </h3>
        <span className="whitespace-nowrap rounded-full border border-line bg-panel-2 px-3 py-1 text-xs font-medium text-muted">
          {DEMO_NOTICE}
        </span>
      </div>

      {/* Example picker */}
      <div className="mt-5">
        <p className="text-sm font-medium text-paper">Pick a sample message:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example.id}
              type="button"
              onClick={() => pickExample(example)}
              aria-pressed={exampleId === example.id}
              className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-all duration-150 ${
                exampleId === example.id
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line bg-panel-2 text-paper hover:border-accent active:scale-[0.97]"
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
        className="mt-5 block text-sm font-medium text-paper"
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
        className="mt-2 w-full rounded-xl border border-line bg-panel-2 px-3 py-2 text-sm leading-relaxed text-paper outline-none focus:border-accent"
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runCrew}
          disabled={stage === "working" || customerMessage.trim().length === 0}
          className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full bg-cta px-5 text-sm font-semibold text-void transition-all duration-200 hover:-translate-y-px disabled:opacity-50 active:translate-y-0 active:scale-[0.98]"
        >
          {stage === "working" ? "Crew working…" : "Let the crew work"}
        </button>
        {running && !reducedMotion && (
          <button
            type="button"
            onClick={() => setManualPaused((p) => !p)}
            aria-pressed={manualPaused}
            className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full border border-line bg-panel px-4 text-sm font-medium text-paper transition-transform duration-150 hover:border-accent active:scale-[0.98]"
          >
            {manualPaused ? "Resume" : "Pause"}
          </button>
        )}
        {autoDone && stage === "review" && !reducedMotion && (
          <button
            type="button"
            onClick={replay}
            className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full border border-line bg-panel px-4 text-sm font-medium text-paper transition-transform duration-150 hover:border-accent active:scale-[0.98]"
          >
            Replay
          </button>
        )}
        {(stage === "review" ||
          stage === "editing" ||
          stage === "sent" ||
          stage === "rejected") && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full border border-line bg-panel px-4 text-sm font-medium text-paper transition-transform duration-150 hover:border-accent active:scale-[0.98]"
          >
            Try another message
          </button>
        )}
        <span
          aria-live="polite"
          className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${statusClass}`}
        >
          {statusLabel}
        </span>
      </div>

      {/* Crew steps — fixed min-height, no layout shift when steps change */}
      <div className="mt-6 min-h-[240px] border-t border-line pt-6 sm:min-h-[216px]">
        <ol className="space-y-4">
          {STEPS.map((step, index) => {
            const isDone = allStepsDone || currentStep > index;
            const isCurrent = stage === "working" && currentStep === index;
            return (
              <li
                key={step.id}
                className={`flex gap-4 transition-opacity duration-300 ${
                  isDone && !isCurrent ? "opacity-55" : "opacity-100"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-sm font-medium transition-transform duration-300 ${
                    isCurrent ? "scale-[1.12] " : ""
                  }${
                    isDone
                      ? "border-approve bg-approve/10 text-approve"
                      : isCurrent
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-line bg-panel-2 text-meta"
                  }`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p
                    className={`flex items-center gap-2 font-display text-lg font-semibold ${
                      isCurrent || isDone ? "text-paper" : "text-muted"
                    }`}
                  >
                    {step.label}
                    {isCurrent && (
                      <span
                        className="flex gap-1"
                        aria-hidden="true"
                      >
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:300ms]" />
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {step.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-xs text-meta">
          {stage === "working"
            ? "Demo: the crew is working through each step."
            : stage === "idle"
              ? " "
              : "Demo: all three steps are complete. The draft below is waiting for you."}
        </p>
      </div>

      {/* Draft + decision — fades + rises in when the review stage arrives */}
      {(stage === "review" || stage === "editing") && (
        <div
          className={`mt-6 rounded-xl border border-line bg-panel-2 p-4 transition-all duration-500 ease-out ${
            draftShown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
        >
          <p className="text-sm font-medium text-paper">
            Draft reply (demo — not sent yet)
          </p>
          {stage === "editing" ? (
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={5}
              aria-label="Edit draft reply (demo)"
              className="mt-2 w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm leading-relaxed text-paper outline-none focus:border-accent"
            />
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-paper">{draft}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {stage === "editing" ? (
              <button
                type="button"
                onClick={() => {
                  stopAmbient();
                  setStage("review");
                }}
                className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full bg-cta px-4 text-sm font-semibold text-void transition-transform duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.98]"
              >
                Save edit
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    stopAmbient();
                    setStage("sent");
                  }}
                  className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full bg-cta px-4 text-sm font-semibold text-void transition-transform duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.98]"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopAmbient();
                    setStage("editing");
                  }}
                  className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full border border-line bg-panel px-4 text-sm font-medium text-paper transition-transform duration-150 hover:border-accent active:scale-[0.98]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopAmbient();
                    setStage("rejected");
                  }}
                  className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full border border-reject/40 bg-panel px-4 text-sm font-medium text-reject transition-transform duration-150 hover:border-reject active:scale-[0.98]"
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
          className="mt-6 rounded-xl border border-approve/40 bg-approve/10 p-4"
        >
          <p className="font-medium text-approve">Sent (demo)</p>
          <p className="mt-1 text-sm leading-relaxed text-paper">{draft}</p>
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
          className="mt-6 rounded-xl border border-reject/40 bg-reject/10 p-4"
        >
          <p className="font-medium text-reject">Rejected (demo)</p>
          <p className="mt-1 text-sm leading-relaxed text-paper">
            This draft was rejected. Nothing was sent, and no quota was used —
            quota counts only per reply actually sent.
          </p>
        </div>
      )}
    </div>
  );
}
