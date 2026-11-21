import { DEMO_NOTICE, FAQ, FREE_DAILY_LIMIT, HERO, PLANS, SITE } from "@/lib/site-data";
import InboxSimulator from "@/components/inbox-simulator";
import CrewTimeline from "@/components/crew-timeline";

/**
 * CrewDesk landing page.
 * Scroll unit: one founder's workday — morning inbox pile-up → midday the
 * crew works → afternoon the founder approves → night an empty inbox.
 * One <h1> (hero). Prices come only from lib/site-data.ts.
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

const COMPARISON: { name: string; note: string }[] = [
  {
    name: "Lindy",
    note: "Trial lasts 7 days — then you pay or stop.",
  },
  {
    name: "Sintra",
    note: "Drafts only — the crew drafts, but sending stays on you.",
  },
  {
    name: "Marblism",
    note: "No free tier — you pay before you know if it fits.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Pill nav */}
      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
        <nav
          aria-label="Main"
          className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6"
        >
          <a
            href="#top"
            className="flex items-center gap-2 font-display text-xl font-bold tracking-tight"
          >
            <img src="/logo.png" alt="CrewDesk logo" className="h-8 w-8 rounded-lg" />
            {SITE.name}
          </a>
          <div className="hidden items-center gap-1 rounded-full border border-line bg-white px-2 py-1 text-sm sm:flex">
            <a href="#product" className="rounded-full px-3 py-1.5 hover:bg-paper">
              Product
            </a>
            <a href="#pricing" className="rounded-full px-3 py-1.5 hover:bg-paper">
              Pricing
            </a>
            <a href="#faq" className="rounded-full px-3 py-1.5 hover:bg-paper">
              FAQ
            </a>
          </div>
          <a
            href="#pricing"
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Start free
          </a>
        </nav>
      </header>

      <main id="top">
        {/* Hero — cinematic full-bleed, left-aligned, one CTA */}
        <section className="bg-ink text-paper">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-paper/70">
              {SITE.tagline} Support Crew for solo founders
            </p>
            <h1 className="mt-6 max-w-3xl font-display text-5xl font-bold leading-[1.02] sm:text-7xl">
              {HERO.headline}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-paper/80">
              {HERO.subtext}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#pricing"
                className="rounded-full bg-accent px-6 py-3.5 text-base font-semibold text-white"
              >
                {HERO.cta}
              </a>
              <p className="text-sm text-paper/70">
                Free forever — {FREE_DAILY_LIMIT} replies a day. No card required.
              </p>
            </div>
            <p className="mt-10 text-xs uppercase tracking-widest text-paper/50">
              Triage &nbsp;→&nbsp; Reply &nbsp;→&nbsp; Approve
            </p>
          </div>
        </section>

        {/* Product — the interactive moment */}
        <section id="product" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            One job, done in front of you
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted">
            This is the whole product: a message comes in, the crew triages it
            and drafts a reply, and you approve it. Try it below — every word
            here is demo data.
          </p>
          <div className="mt-8">
            <InboxSimulator />
          </div>
          <div className="mt-8">
            <CrewTimeline />
          </div>
        </section>

        {/* A day with CrewDesk — the scroll unit */}
        <section className="border-y border-line bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              A day with CrewDesk
            </h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-muted">
              One workday, four hours. Morning the inbox piles up, midday the
              crew works, afternoon you approve, night the inbox is empty.
            </p>
            <ol className="mt-10 space-y-0">
              {DAY.map((step, index) => (
                <li
                  key={step.time}
                  className="relative flex gap-5 border-l-2 border-line pb-10 pl-6 last:pb-0"
                >
                  <span
                    aria-hidden="true"
                    className="absolute -left-[17px] top-0 flex h-8 w-8 items-center justify-center rounded-full border border-accent bg-paper text-sm font-semibold text-accent"
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-accent">
                      {step.time}
                    </p>
                    <h3 className="mt-1 font-display text-2xl font-semibold">
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

        {/* Why not the others — honest, no invented numbers */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Why not the others
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted">
            Other tools do part of the job. CrewDesk does one job end to end —
            and the free tier is free forever, not a countdown.
          </p>
          <div className="mt-8 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            <div className="grid grid-cols-[1fr_2fr] gap-4 bg-paper px-5 py-3 text-sm font-semibold">
              <span>Tool</span>
              <span>Where it stops</span>
            </div>
            {COMPARISON.map((row) => (
              <div
                key={row.name}
                className="grid grid-cols-[1fr_2fr] gap-4 px-5 py-4"
              >
                <span className="font-display text-lg font-semibold">
                  {row.name}
                </span>
                <span className="leading-relaxed text-muted">{row.note}</span>
              </div>
            ))}
            <div className="grid grid-cols-[1fr_2fr] gap-4 bg-accent/5 px-5 py-4">
              <span className="font-display text-lg font-semibold text-accent">
                {SITE.name}
              </span>
              <span className="leading-relaxed">
                Free forever with {FREE_DAILY_LIMIT} replies a day — triage,
                reply, and approval in one place.
              </span>
            </div>
          </div>
        </section>

        {/* Pricing — from PLANS only */}
        <section id="pricing" className="border-y border-line bg-white">
          <div className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Pricing</h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-muted">
              Start free, upgrade when your inbox grows. Quota counts per reply
              actually sent — drafts and rejections cost nothing.
            </p>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {PLANS.map((plan) => (
                <article
                  key={plan.id}
                  className={`flex flex-col rounded-2xl border p-6 ${
                    plan.id === "starter"
                      ? "border-accent bg-paper shadow-sm"
                      : "border-line bg-paper"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-2xl font-semibold">
                      {plan.name}
                    </h3>
                    {plan.comingSoon && (
                      <span className="rounded-full border border-amber bg-amber/10 px-2.5 py-1 text-xs font-semibold text-amber">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <p className="mt-4">
                    <span className="font-display text-5xl font-bold">
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
                      href="#faq"
                      className="mt-6 rounded-full border border-line bg-white px-5 py-2.5 text-center text-sm font-semibold"
                    >
                      {plan.cta}
                    </a>
                  ) : (
                    <a
                      href="#product"
                      className="mt-6 rounded-full bg-accent px-5 py-2.5 text-center text-sm font-semibold text-white"
                    >
                      {plan.cta}
                    </a>
                  )}
                </article>
              ))}
            </div>
            <p className="mt-6 text-sm text-muted">
              Growth is coming soon — join the waitlist and we will tell you
              when it ships. No payment is taken for Growth today.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">FAQ</h2>
          <div className="mt-8 divide-y divide-line border-y border-line">
            {FAQ.map((item) => (
              <details key={item.question} className="group py-5">
                <summary className="cursor-pointer list-none font-display text-xl font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
                  <span className="flex items-start justify-between gap-4">
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
      </main>

      {/* Footer */}
      <footer className="border-t border-line bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="flex items-center gap-2 font-display text-xl font-bold">
              <img src="/logo.png" alt="CrewDesk logo" className="h-7 w-7 rounded-md" />
              {SITE.name}
            </p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-paper/70">
              {SITE.tagline} It finishes the work, you approve, it ships.
            </p>
          </div>
          <nav aria-label="Footer" className="flex gap-8 text-sm">
            <a href="#product" className="text-paper/80 hover:text-paper">
              Product
            </a>
            <a href="#pricing" className="text-paper/80 hover:text-paper">
              Pricing
            </a>
            <a href="#faq" className="text-paper/80 hover:text-paper">
              FAQ
            </a>
          </nav>
        </div>
        <div className="border-t border-paper/15">
          <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-paper/60 sm:px-6">
            {DEMO_NOTICE}. © 2026 {SITE.name}.
          </p>
        </div>
      </footer>
    </div>
  );
}
