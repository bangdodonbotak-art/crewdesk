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

// Explosion captions for "The inbox, exploded" — one per quarter of the
// 2.4s auto-play. Plain product copy, no invented numbers.
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
  // FIX-REPORT-3D-2: the scroll-linked hold failed twice live (GSAP pin,
  // then CSS sticky) with NO measurable root cause — rule applied
  // (z-index:10 proves it), ancestors clean (no overflow/transform/
  // filter), wrapper 2361px tall, gate active — yet real Chrome scrolls
  // 1:1. The hold is unprovable in this VM (Obscura ignores nested
  // sticky AND misreports computed top), and the 160vh scroll room left
  // a 3–4 viewport empty hole on the live page. So the explosion is now
  // an INTO-VIEW AUTO-PLAY: when the card is half visible, the three
  // layers pull apart and reassemble once (~2.4s), captions stepping
  // 1/4→4/4 with a guaranteed 0.6s dwell each (the old scrub's "3/4
  // never caught" was a scroll-sampling artifact). No pin, no sticky,
  // no spacer, no hole. The step engine pauses for the 2.4s (same
  // pattern as the old scrollMode pause, but time-bounded), then
  // resumes. Desktop fine-pointer ≥1025px + no reduced-motion only;
  // everywhere else the card is static, exactly as before.
  const [explosionState, setExplosionState] = useState<
    "static" | "armed" | "playing" | "done"
  >("static");
  const [explosionReason, setExplosionReason] = useState("init");
  const [explosionPlaying, setExplosionPlaying] = useState(false);
  // FIX-REPORT-3D-3: the explosion is driven by React state + CSS
  // transition, NOT by a GSAP timeline. Round-3 diagnosis: the GSAP
  // timeline PROGRESSED in real Chrome (captions stepped 1/4→4/4 on time)
  // but its layer transforms NEVER rendered there, while the same code
  // showed triage matrix(..., -32) in Obscura — and the live JS is
  // byte-identical to the local JS, the CSS cannot block the transform
  // (transition-opacity is opacity-only), there is exactly one set of
  // [data-layer] targets, and the nodes are stable across re-renders.
  // No root cause is observable from this VM, so the driver changes:
  // React owns the transform via a style prop, written to the CURRENT
  // node on every render — immune to stale-node / killed-timeline /
  // GSAP-React ownership races. Same values, same 2.4s, same captions.
  // explodeStep: 0 idle, 1 triage out, 2 +reply out, 3 all out,
  // 4 all back to identity (reassembling). 0.6s per step.
  const [explodeStep, setExplodeStep] = useState(0);
  const explodeTimeoutsRef = useRef<number[]>([]);
  const explosionPlayedRef = useRef(false);
  const explosionArmedRef = useRef(false);
  const playExplosionRef = useRef<(() => void) | null>(null);
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
  // FIX-REPORT-3D: hover-pause is a convenience for the AMBIENT autoplay
  // ONLY. Once the user touches any control, hover must never pause the
  // engine again for that run: in the live audit the timer stayed frozen
  // after Resume, and a scroll-induced mouseenter (elements moving under
  // a stationary pointer) or a focusin can re-engage it. hoverEnabled
  // flips false on any manual control and back true only when a NEW
  // ambient cycle starts. The mouseleave/onBlur re-arm is GONE — a
  // re-enter after Resume must not freeze the timer again.
  const hoverEnabledRef = useRef(true);
  // Hover/focus pause only exists on devices that really hover
  // ((hover: hover) and (pointer: fine)). Coarse pointers never set
  // hoverPaused — on touch a tap would otherwise freeze the engine
  // with no pointerleave to release it (ensemble).
  const canHoverPauseRef = useRef(false);
  // FIX-REPORT-3D-2: explosionPlaying pauses the step engine for the
  // 2.4s auto-play, then it resumes where it left off. The old
  // scrollMode pause is gone with the scrub.
  const paused =
    manualPaused || hoverPaused || outOfViewPaused || explosionPlaying;
  // Diagnostic for the live check: which pause flags are active now.
  const pauseFlags =
    [
      manualPaused ? "manual" : null,
      hoverPaused ? "hover" : null,
      outOfViewPaused ? "outofview" : null,
      explosionPlaying ? "explosion" : null,
    ]
      .filter(Boolean)
      .join("+") || "none";

  // Atomic pause reset: clears EVERY pause flag at once (ensemble — the
  // old Resume cleared only manualPaused, so hoverPaused kept the timer
  // frozen). Also disarms hover-pause until the pointer leaves and
  // re-enters, so Resume works while the pointer stays over the card.
  const clearPause = () => {
    setManualPaused(false);
    setHoverPaused(false);
    hoverArmedRef.current = false;
    hoverEnabledRef.current = false;
  };

  // FIX-REPORT-3D-3: clear the pending explosion chain (Replay clicked
  // mid-play, unmount). A restart must always begin from step 1.
  const clearExplodeTimeouts = () => {
    explodeTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
    explodeTimeoutsRef.current = [];
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
      // FIX-REPORT-3D-2: no explosion on reduced-motion — static card.
      explosionArmedRef.current = false;
      setExplosionState("static");
      setExplosionReason("reduced-motion");
      return;
    }
    setStage("working");
    setCurrentStep(0);
    setRunning(true);
    setIsAuto(true);
    // A fresh ambient cycle re-enables hover-pause (FIX-REPORT-3D).
    hoverArmedRef.current = true;
    hoverEnabledRef.current = true;
    // FIX-REPORT-3D-2: arm the into-view explosion (desktop fine pointer
    // ≥1025px only). The observer effect below does the rest.
    if (
      window.matchMedia("(min-width: 1025px) and (pointer: fine)").matches
    ) {
      explosionArmedRef.current = true;
      setExplosionState("armed");
      setExplosionReason("ok");
    } else {
      explosionArmedRef.current = false;
      setExplosionState("static");
      setExplosionReason("width-or-pointer");
    }
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
          // A fresh ambient cycle re-enables hover-pause (FIX-REPORT-3D).
          hoverArmedRef.current = true;
          hoverEnabledRef.current = true;
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

  // "The inbox, exploded" — the single 3D moment, as an INTO-VIEW
  // AUTO-PLAY driven by React state + CSS transition (FIX-REPORT-3D-3).
  // The scroll hold failed twice live (GSAP pin, then CSS sticky), and
  // the GSAP-timeline auto-play failed a third time: the timeline
  // PROGRESSED in real Chrome (captions stepped 1/4-4/4 on time) but
  // its layer transforms never rendered there, while the same code
  // showed triage at y -32 in Obscura. No root cause is observable
  // from this VM (live JS byte-identical, CSS cannot block it, one set
  // of targets, nodes stable), so the driver changes instead of the
  // numbers: React owns the transform via a style prop on the CURRENT
  // node — no timeline to kill, no selector to resolve, no stale node.
  // When the card is half visible the three step layers split apart in
  // shallow 2.5D and reassemble (~2.4s), captions stepping 1/4-4/4
  // with a guaranteed 0.6s dwell each. The step engine pauses for the
  // 2.4s, then resumes where it left off. Replay re-runs it.
  // Desktop fine-pointer >=1025px + no reduced-motion only; everywhere
  // else the card is static, exactly as before.
  useEffect(() => {
    if (reducedMotion || !explosionArmedRef.current) return;
    const el = containerRef.current;
    if (!el) return;
    const play = () => {
      if (explosionPlayedRef.current) return;
      explosionPlayedRef.current = true;
      // Restart cleanly: clear any pending chain (e.g. Replay clicked
      // mid-play) so the steps always start from 1 — the old GSAP
      // timeline's kill-mid-play left layers at mid-flight values.
      clearExplodeTimeouts();
      setExplosionPlaying(true);
      setExplosionState("playing");
      setExplodeStep(1);
      // 0.6s per quarter, same timing as the old timeline:
      // 1 = triage out, 2 = +reply out, 3 = all out,
      // 4 = all back to identity, then done at 2.4s.
      explodeTimeoutsRef.current = [
        window.setTimeout(() => setExplodeStep(2), 600),
        window.setTimeout(() => setExplodeStep(3), 1200),
        window.setTimeout(() => setExplodeStep(4), 1800),
        window.setTimeout(() => {
          setExplodeStep(0);
          setExplosionPlaying(false);
          setExplosionState("done");
        }, 2400),
      ];
    };
    // Replay button re-runs the explosion (same intent as re-running
    // the steps). No-op on mobile / reduced-motion (ref unset there).
    playExplosionRef.current = () => {
      explosionPlayedRef.current = false;
      play();
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) play();
      },
      // Threshold 0.5, not 0: at load only ~7% of the card is visible
      // (1280x800), so 0 would fire while the visitor is still reading
      // the hero and the 2.4s moment would be missed. 0.5 fires when
      // the visitor has actually scrolled to the card.
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      playExplosionRef.current = null;
      clearExplodeTimeouts();
    };
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

  // FIX-REPORT-3D-2: Replay re-runs the explosion too (same "watch the
  // demo again" intent as re-running the steps). No-op on mobile /
  // reduced-motion, where the ref is never set.
  const replayExplosion = () => {
    playExplosionRef.current?.();
  };

  const replay = () => {
    setUserInteracted(true);
    setAutoDone(false);
    clearPause();
    setStage("working");
    setCurrentStep(0);
    setRunning(true);
    setIsAuto(true);
    replayExplosion();
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

  // FIX-REPORT-3D-3: layer transform from React state (explodeStep).
  // Same values as the old GSAP timeline (triage y -32 / rotX -8 / z 30;
  // reply z 70 / scale 1.02; approve y +32 / rotX +8 / z 30), same 0.6s
  // per step. Identity keeps the same function list so the browser
  // interpolates smoothly. The transition lives in the inline style so
  // it cannot be overridden by the Tailwind transition-opacity class.
  const layerTransform = (id: string): string => {
    const out =
      id === "triage"
        ? explodeStep >= 1 && explodeStep <= 3
        : id === "reply"
          ? explodeStep >= 2 && explodeStep <= 3
          : explodeStep === 3;
    if (!out) {
      return id === "reply"
        ? "translate3d(0px, 0px, 0px) scale(1)"
        : "translate3d(0px, 0px, 0px) rotateX(0deg)";
    }
    if (id === "triage") return "translate3d(0px, -32px, 30px) rotateX(-8deg)";
    if (id === "reply") return "translate3d(0px, 0px, 70px) scale(1.02)";
    return "translate3d(0px, 32px, 30px) rotateX(8deg)";
  };

  return (
    <div
      ref={containerRef}
      data-explosion={explosionState}
      data-explosion-reason={explosionReason}
      data-pause={pauseFlags}
      className="rounded-xl border border-line bg-panel p-5 shadow-sm sm:p-6"
      onMouseEnter={() => {
        if (
          canHoverPauseRef.current &&
          hoverArmedRef.current &&
          hoverEnabledRef.current
        )
          setHoverPaused(true);
      }}
      onMouseLeave={() => {
        setHoverPaused(false);
        // FIX-REPORT-3D: no re-arm. A scroll-induced re-enter after
        // Resume must not freeze the timer again.
      }}
      onFocus={() => {
        // FIX-REPORT-3D: focus respects the same gates as hover — the
        // old handler set hoverPaused unconditionally, so focusing the
        // Pause/Resume button re-paused the engine after Resume.
        if (
          canHoverPauseRef.current &&
          hoverArmedRef.current &&
          hoverEnabledRef.current
        )
          setHoverPaused(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setHoverPaused(false);
          // FIX-REPORT-3D: no re-arm (see onMouseLeave).
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

      {/* Explosion caption — rendered only when the auto-play moment
          exists (desktop fine pointer). During the 2.4s play it steps
          1/4→4/4; before/after it is a plain hint. Never a promise the
          page cannot keep. */}
      {explosionState !== "static" && (
        <p className="mt-3 font-mono text-xs text-accent" aria-live="polite">
          {explosionPlaying
            ? EXPLODE_CAPTIONS[Math.max(0, explodeStep - 1)]
            : "Watch one message pull apart — Triage · Reply · Approve"}
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
              // FIX-REPORT-3D: any touch of this button is a manual
              // control — hover-pause stays off for the rest of the run.
              hoverEnabledRef.current = false;
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
                style={{
                  transform: layerTransform(step.id),
                  transition: "transform 0.6s ease-in-out, opacity 0.3s ease",
                }}
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
