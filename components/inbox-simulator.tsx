"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
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

// Scrub captions for "The inbox, exploded" — one per quarter of the
// pinned scrub. Plain product copy, no invented numbers.
const EXPLODE_CAPTIONS = [
  "1 / 4 — Triage: the crew reads the message",
  "2 / 4 — Reply: a draft from your knowledge base",
  "3 / 4 — Approve: you decide",
  "4 / 4 — Sent: it ships",
];

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
  // scrollMode: the pinned "exploded" scrub owns the card while active —
  // the timer-driven step engine is suspended, never fighting the scrub.
  // One controller at a time: ambient OR scroll OR manual (ensemble).
  const [scrollMode, setScrollMode] = useState(false);
  // scrubReady: true only when the pinned scrub was actually installed
  // (desktop fine pointer, >4 cores, no reduced-motion). The scrub
  // caption renders only then — never a promise the page cannot keep.
  const [scrubReady, setScrubReady] = useState(false);
  const [explodeCaption, setExplodeCaption] = useState(0);
  const [userInteracted, setUserInteracted] = useState(false);
  const [draftShown, setDraftShown] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevInViewRef = useRef(false);
  // Hover-pause is armed by default so the first hover pauses the ambient
  // cycle. clearPause() DISARMS it: after Resume the timer must actually
  // run while the pointer is still over the card — it re-arms only on a
  // fresh pointerleave → mouseenter cycle (F-1 root cause).
  const hoverArmedRef = useRef(true);
  // Hover/focus pause only exists on devices that really hover
  // ((hover: hover) and (pointer: fine)). Coarse pointers never set
  // hoverPaused — on touch a tap would otherwise freeze the engine
  // with no pointerleave to release it (ensemble).
  const canHoverPauseRef = useRef(false);
  const paused =
    manualPaused || hoverPaused || outOfViewPaused || scrollMode;

  // Atomic pause reset: clears EVERY pause flag at once (ensemble — the
  // old Resume cleared only manualPaused, so hoverPaused kept the timer
  // frozen). Also disarms hover-pause until the pointer leaves and
  // re-enters, so Resume works while the pointer stays over the card.
  const clearPause = () => {
    setManualPaused(false);
    setHoverPaused(false);
    hoverArmedRef.current = false;
  };

  // Mount: one ambient auto-play cycle — or a static review frame when the
  // user prefers reduced motion.
  useEffect(() => {
    canHoverPauseRef.current = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;
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

  // "The inbox, exploded" — the single 3D moment (CSS/GSAP only, 0 KB
  // new bundle). One pinned desktop scrub: the three step layers split
  // apart in shallow 2.5D (translateZ + small rotateX, no nested
  // preserve-3d), then reassemble. Scroll backwards rewinds the story.
  //
  // Gates (all must hold, ensemble decisions): min-width 1025px AND fine
  // pointer (never pin at exactly 1024px — Tailwind lg: starts there),
  // hardwareConcurrency > 4 (low-end desktops get the static card),
  // no prefers-reduced-motion. ONE pin on the whole page (the day pin
  // was cut). The scrub is VISUAL ONLY — it never drives the step
  // engine; while the pin is active scrollMode suspends the timer, so
  // ambient, scroll, and manual never fight (single-controller rule).
  // Mobile / coarse pointer / low-core / reduced-motion: no pin, no
  // scrub — the simulator renders exactly as before.
  useEffect(() => {
    if (reducedMotion) return;
    const el = containerRef.current;
    if (!el) return;
    const cores =
      typeof navigator !== "undefined"
        ? (navigator.hardwareConcurrency ?? 8)
        : 8;
    if (cores <= 4) return;
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1025px) and (pointer: fine)", () => {
      setScrubReady(true);
      // Scoped context: selector text below resolves inside this card
      // only, and ctx.revert() kills the timeline + ScrollTrigger +
      // clears the inline transforms on unmount or breakpoint exit.
      const ctx = gsap.context(() => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: "top top+=72",
            end: "+=160%",
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            onToggle: (self: { isActive: boolean }) =>
              setScrollMode(self.isActive),
            onUpdate: (self: { progress: number }) => {
              const q = Math.min(3, Math.floor(self.progress * 4));
              setExplodeCaption((prev) => (prev === q ? prev : q));
            },
          },
        });
        tl.to(
          '[data-layer="triage"]',
          { y: -32, rotationX: -8, z: 30, duration: 1, ease: "none" },
          0,
        )
          .to(
            '[data-layer="reply"]',
            {
              y: 0,
              rotationX: 0,
              z: 70,
              scale: 1.02,
              duration: 1,
              ease: "none",
            },
            1,
          )
          .to(
            '[data-layer="approve"]',
            { y: 32, rotationX: 8, z: 30, duration: 1, ease: "none" },
            2,
          )
          .to(
            '[data-layer="triage"]',
            { y: 0, rotationX: 0, z: 0, duration: 1, ease: "none" },
            3,
          )
          .to(
            '[data-layer="reply"]',
            { y: 0, rotationX: 0, z: 0, scale: 1, duration: 1, ease: "none" },
            3,
          )
          .to(
            '[data-layer="approve"]',
            { y: 0, rotationX: 0, z: 0, duration: 1, ease: "none" },
            3,
          );
      }, el);
      return () => {
        ctx.revert();
        setScrollMode(false);
        setScrubReady(false);
      };
    });
    return () => mm.revert();
  }, [reducedMotion]);

  const stopAmbient = () => {
    setRunning(false);
    setIsAuto(false);
    setAutoDone(false);
    clearPause();
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
    clearPause();
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
      onMouseEnter={() => {
        if (canHoverPauseRef.current && hoverArmedRef.current)
          setHoverPaused(true);
      }}
      onMouseLeave={() => {
        setHoverPaused(false);
        hoverArmedRef.current = true;
      }}
      onFocus={() => {
        if (canHoverPauseRef.current) setHoverPaused(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setHoverPaused(false);
          hoverArmedRef.current = true;
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

      {/* Scrub caption — rendered only when the pinned scrub is actually
          installed (desktop fine pointer, >4 cores). Never a promise the
          page cannot keep. */}
      {scrubReady && (
        <p className="mt-3 font-mono text-xs text-accent" aria-live="polite">
          {scrollMode
            ? EXPLODE_CAPTIONS[explodeCaption]
            : "Scroll to pull one message apart — Triage · Reply · Approve"}
        </p>
      )}

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
            onClick={() => {
              // Resume must clear EVERY pause flag at once (F-1): the old
              // toggle cleared only manualPaused, so hoverPaused kept the
              // timer frozen while the pointer stayed over the card.
              if (manualPaused) clearPause();
              else setManualPaused(true);
            }}
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
        <ol className="space-y-4 [perspective:1000px]">
          {STEPS.map((step, index) => {
            const isDone = allStepsDone || currentStep > index;
            const isCurrent = stage === "working" && currentStep === index;
            return (
              <li
                key={step.id}
                data-layer={step.id}
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
