"use client";

import { useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DEMO_NOTICE, FAQ, HERO, PLANS, SITE } from "@/lib/site-data";
import InboxSimulator, { STEPS } from "@/components/inbox-simulator";
import Reveal from "@/components/reveal";
import { useMotion } from "@/components/motion-provider";

/**
 * CrewDesk landing page.
 * Scroll unit: one founder's workday — morning inbox pile-up → midday the
 * crew works → afternoon the founder approves → night an empty inbox.
 * One h1 (hero). Prices come only from lib/site-data.ts.
 * The inbox simulator lives inside the hero. The old static timeline
 * component was removed (pure duplicate of the simulator) — see
 * REVISION-PROMPT §5 item 7.
 */

const DAY: { time: string; title: string; body: string }[] = [
  {
    time: "08:00 — Morning",
    title: "The inbox piles up",
    body: "Overnight, customers wrote in: a refund, a pricing question, a bug. You open the inbox and the day already feels full before it starts.",
  },
  {
    time: "12:00 — Midday",
    title: "The crew works",
    body: "CrewDesk triages every message, drafts replies in your voice, and escalates the ones it cannot handle. You do other work — the inbox is being handled.",
  },
  {
    time: "16:00 — Afternoon",
    title: "You approve",
    body: "Drafts wait for you, not the other way round. Read each one, approve it, edit it, or reject it. Nothing is sent without your say-so.",
  },
  {
    time: "21:00 — Night",
    title: "Inbox zero",
    body: "Every customer has an answer. The inbox is empty, the day is yours again — and tomorrow the crew starts over.",
  },
];

/** H1 split from the blueprint headline (words unchanged): first clause at
 * full display size, the rest at ~40% in muted. */
const H1_SPLIT = HERO.headline.indexOf(". ");
const H1_FIRST = HERO.headline.slice(0, H1_SPLIT + 1);
const H1_REST = HERO.headline.slice(H1_SPLIT + 2);

/** Sticky mobile CTA — appears only after the hero scrolls out of view. */
function StickyMobileCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero");
    if (!hero) return;
    const observer = new IntersectionObserver(
      (entries) => setVisible(!entries[0].isIntersecting),
      { threshold: 0 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-line bg-void/95 backdrop-blur transition-all duration-300 md:hidden ${
        visible
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-full opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <a
          href="/login"
          tabIndex={visible ? 0 : -1}
          className="flex min-h-11 flex-1 items-center justify-center whitespace-nowrap rounded-full bg-cta px-4 text-sm font-semibold text-void"
        >
          {HERO.cta}
        </a>
        <a
          href="#pricing"
          tabIndex={visible ? 0 : -1}
          className="flex min-h-11 items-center whitespace-nowrap px-2 text-sm font-medium text-paper"
        >
          Pricing
        </a>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { reducedMotion } = useMotion();

  // Hero entrance (mount) + the page's only scrub (timeline line).
  // Transform + opacity only; skipped entirely on reduced-motion.
  useEffect(() => {
    if (reducedMotion) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.from('[data-hero="line1"]', {
        y: 24, opacity: 0, duration: 0.8, ease: "power3.out",
      });
      gsap.from('[data-hero="line2"]', {
        y: 24, opacity: 0, duration: 0.8, delay: 0.12, ease: "power3.out",
      });
      gsap.from('[data-hero="sub"]', {
        y: 16, opacity: 0, duration: 0.7, delay: 0.25, ease: "power2.out",
      });
      gsap.from('[data-hero="cta"]', {
        y: 16, opacity: 0, duration: 0.7, delay: 0.25, ease: "power2.out",
      });
      gsap.from('[data-hero="sim"]', {
        y: 24, opacity: 0, duration: 0.8, delay: 0.35, ease: "power3.out",
      });
      // Hero glow fades as the hero scrolls away (scrub, opacity only).
      gsap.to(".hero-glow-el", {
        opacity: 0.35,
        ease: "none",
        scrollTrigger: {
          trigger: "#hero",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
      // A-day timeline line draws itself (the page's only other scrub).
      gsap.from(".timeline-line", {
        scaleY: 0,
        transformOrigin: "top",
        ease: "none",
        scrollTrigger: {
          trigger: "#day-timeline",
          start: "top 85%",
          end: "bottom 60%",
          scrub: true,
        },
      });
      gsap.from(".timeline-dot", {
        scale: 0.6,
        opacity: 0,
        duration: 0.4,
        ease: "power2.out",
        stagger: 0.12,
        scrollTrigger: { trigger: "#day-timeline", start: "top 85%", once: true },
      });
    });
    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <div id="top" className="min-h-screen bg-void text-paper">
      {/* Pill nav */}
      <header className="sticky top-0 z-20 border-b border-line bg-void/95 backdrop-blur">
        <nav
          aria-label="Main"
          className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6"
        >
          <a
            href="#top"
            className="group flex min-h-11 items-center gap-2 whitespace-nowrap font-display text-xl font-bold tracking-tight"
          >
            <img src="/logo-96.png" alt="CrewDesk logo" className="h-8 w-8 rounded-md transition-transform duration-200 group-hover:scale-[1.04] group-active:scale-100" />
            {SITE.name}
          </a>
          <div className="hidden items-center gap-1 rounded-full border border-line bg-panel px-2 py-1 text-sm sm:flex">
            <a href="#product" className="flex min-h-11 items-center whitespace-nowrap rounded-full px-3 hover:bg-panel-2 active:bg-panel-2">
              Product
            </a>
            <a href="#pricing" className="flex min-h-11 items-center whitespace-nowrap rounded-full px-3 hover:bg-panel-2 active:bg-panel-2">
              Pricing
            </a>
            <a href="#faq" className="flex min-h-11 items-center whitespace-nowrap rounded-full px-3 hover:bg-panel-2 active:bg-panel-2">
              FAQ
            </a>
          </div>
          <a
            href="/login"
            className="flex min-h-11 items-center whitespace-nowrap rounded-full border border-transparent bg-cta px-4 text-sm font-semibold text-void transition-transform duration-200 hover:-translate-y-px hover:border-accent active:translate-y-0 active:scale-[0.98]"
          >
            Start free
          </a>
        </nav>
      </header>

      <main id="main" tabIndex={-1}>
        {/* Hero — void canvas, one glow, simulator inside */}
        <section id="hero" className="hero-grid relative bg-void text-paper">
          <div aria-hidden="true" className="hero-glow hero-glow-el pointer-events-none absolute inset-0" />
          <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-24">
            <h1 className="max-w-3xl text-balance font-display text-[clamp(2.5rem,7vw,4.5rem)] font-bold leading-[1.0] tracking-[-0.02em] text-paper">
              <span data-hero="line1" className="block">{H1_FIRST}</span>
              <span data-hero="line2" className="mt-3 block text-[0.42em] font-semibold leading-[1.2] tracking-[-0.01em] text-muted sm:mt-4">
                {H1_REST}
              </span>
            </h1>
            <p data-hero="sub" className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              {HERO.subtext}
            </p>
            <div data-hero="cta" className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="/login"
                className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full bg-cta px-6 py-3.5 text-base font-semibold text-void transition-transform duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.98]"
              >
                {HERO.cta}
              </a>
              <p className="text-sm text-muted">
                Free forever. No card required.
              </p>
            </div>
            <div data-hero="sim" className="mt-10 sm:mt-12">
              <InboxSimulator />
            </div>
          </div>
        </section>

        {/* How it works — 3 numbered rows, copy from the simulator STEPS */}
        <Reveal staggerChildren delay={0.1}>
        <section id="product" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
          <h2 data-reveal-child className="text-balance font-display text-3xl font-bold tracking-[-0.015em] sm:text-4xl">
            How it works
          </h2>
          <ol className="mt-10 space-y-8">
            {STEPS.map((step, index) => (
              <li
                key={step.id}
                data-reveal-child
                className="flex gap-5 border-t border-line pt-6 first:border-t-0 first:pt-0"
              >
                <span
                  aria-hidden="true"
                  className="shrink-0 font-mono text-sm font-medium text-accent"
                >
                  0{index + 1}
                </span>
                <div>
                  <h3 className="text-balance font-display text-2xl font-semibold">
                    {step.label}
                  </h3>
                  <p className="mt-1 max-w-2xl leading-relaxed text-muted">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        </Reveal>

        {/* A day with CrewDesk — the scroll unit */}
        <Reveal staggerChildren delay={0.12}>
        <section className="border-y border-line bg-panel">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
            <h2 data-reveal-child className="text-balance font-display text-3xl font-bold tracking-[-0.015em] sm:text-4xl">
              A day with CrewDesk
            </h2>
            <p data-reveal-child className="mt-3 max-w-2xl leading-relaxed text-muted">
              One workday, four hours. Morning the inbox piles up, midday the
              crew works, afternoon you approve, night the inbox is empty.
            </p>
            <ol id="day-timeline" className="relative mt-10 space-y-0">
              <div aria-hidden="true" className="timeline-line absolute -left-[2px] bottom-2 top-2 w-0.5 origin-top bg-line" />
              {DAY.map((step, index) => (
                <li
                  key={step.time}
                  data-reveal-child
                  className="relative flex gap-5 pb-10 pl-6 last:pb-0"
                >
                  <span
                    aria-hidden="true"
                    className="timeline-dot absolute -left-[17px] top-0 flex h-8 w-8 items-center justify-center rounded-full border border-accent bg-panel font-mono text-sm font-medium text-accent"
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-mono text-sm text-accent">
                      {step.time}
                    </p>
                    <h3 className="mt-1 text-balance font-display text-2xl font-semibold">
                      {step.title}
                    </h3>
                    <p className="mt-2 max-w-2xl leading-relaxed text-muted">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
        </Reveal>

        {/* Pricing — from PLANS only */}
        <Reveal staggerChildren delay={0.12}>
        <section id="pricing" className="scroll-mt-20 border-y border-line bg-panel">
          <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
            <h2 data-reveal-child className="text-balance font-display text-3xl font-bold tracking-[-0.015em] sm:text-4xl">Pricing</h2>
            <p data-reveal-child className="mt-3 max-w-2xl leading-relaxed text-muted">
              Start free, upgrade when your inbox grows. Quota counts per reply
              actually sent — drafts and rejections cost nothing.
            </p>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {PLANS.map((plan) => {
                const isStarter = plan.id === "starter";
                // REVISION-PROMPT §5 item 7: shorten the 30-char CTA
                // "Start free — upgrade when ready" to "Upgrade when ready".
                const ctaLabel =
                  plan.id === "starter" ? "Upgrade when ready" : plan.cta;
                return (
                <article
                  key={plan.id}
                  data-reveal-child
                  className={`flex flex-col rounded-xl border p-6 transition-transform duration-200 pointer-fine:hover:-translate-y-1 ${
                    isStarter
                      ? "border-accent bg-panel-2"
                      : "border-line bg-panel"
                  }`}
                >
                  {isStarter && (
                    <p data-reveal-child className="mb-4 whitespace-nowrap font-mono text-xs font-medium text-accent">
                      MOST POPULAR
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-2xl font-semibold">
                      {plan.name}
                    </h3>
                    {plan.comingSoon && (
                      <span className="whitespace-nowrap rounded-full border border-amber bg-amber/10 px-2.5 py-1 text-xs font-semibold text-amber">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <p data-reveal-child className="mt-4">
                    <span className="font-display text-[56px] font-bold leading-none tabular-nums">
                      ${plan.monthlyPriceUsd}
                    </span>
                    <span className="text-muted"> / month</span>
                  </p>
                  <p className="mt-1 text-sm text-muted">{plan.billingNote}</p>
                  <ul className="mt-5 flex-1 space-y-2 text-sm leading-relaxed">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <span aria-hidden="true" className="text-accent">—</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {plan.comingSoon ? (
                    <a
                      href="/login"
                      className="mt-6 inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full border border-line bg-panel px-5 text-sm font-semibold text-paper transition-transform duration-200 hover:-translate-y-px hover:border-accent active:translate-y-0 active:scale-[0.98]"
                    >
                      {ctaLabel}
                    </a>
                  ) : isStarter ? (
                    <a
                      href="/login"
                      className="mt-6 inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full bg-cta px-5 text-sm font-semibold text-void transition-transform duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.98]"
                    >
                      {ctaLabel}
                    </a>
                  ) : (
                    <a
                      href="/login"
                      className="mt-6 inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full border border-line bg-panel px-5 text-sm font-semibold text-paper transition-transform duration-200 hover:-translate-y-px hover:border-accent active:translate-y-0 active:scale-[0.98]"
                    >
                      {ctaLabel}
                    </a>
                  )}
                </article>
                );
              })}
            </div>
            <p className="mt-6 text-sm text-muted">
              Growth is coming soon — join the waitlist and we will tell you
              when it ships. No payment is taken for Growth today.
            </p>
          </div>
        </section>
        </Reveal>

        {/* FAQ */}
        <Reveal staggerChildren delay={0.06}>
        <section id="faq" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <h2 data-reveal-child className="text-balance font-display text-3xl font-bold tracking-[-0.015em] sm:text-4xl">FAQ</h2>
          <div className="mt-8 divide-y divide-line border-y border-line">
            {FAQ.map((item) => (
              <details key={item.question} data-reveal-child className="group py-5">
                <summary className="flex min-h-11 cursor-pointer list-none items-center font-display text-xl font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
                  <span className="flex w-full items-start justify-between gap-4">
                    {item.question}
                    <span aria-hidden="true" className="text-accent transition-transform group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
        </Reveal>
      </main>

      {/* Footer */}
      <Reveal staggerChildren delay={0.05}>
      <footer className="border-t border-line bg-void text-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
          <div data-reveal-child>
            <p className="flex items-center gap-2 font-display text-xl font-bold">
              <img src="/logo-96.png" alt="CrewDesk logo" className="h-7 w-7 rounded-md" />
              {SITE.name}
            </p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
              {SITE.tagline} It finishes the work, you approve, it ships.
            </p>
          </div>
          <nav aria-label="Footer" className="flex gap-8 text-sm">
            <a data-reveal-child href="#product" className="flex min-h-11 items-center whitespace-nowrap text-muted hover:text-paper active:text-paper">
              Product
            </a>
            <a data-reveal-child href="#pricing" className="flex min-h-11 items-center whitespace-nowrap text-muted hover:text-paper active:text-paper">
              Pricing
            </a>
            <a data-reveal-child href="#faq" className="flex min-h-11 items-center whitespace-nowrap text-muted hover:text-paper active:text-paper">
              FAQ
            </a>
          </nav>
        </div>
        <div className="border-t border-line">
          <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-meta sm:px-6">
            {DEMO_NOTICE}. © 2026 {SITE.name}.
          </p>
        </div>
      </footer>
      </Reveal>

      <StickyMobileCta />
    </div>
  );
}
