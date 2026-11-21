/**
 * CrewDesk — single source of truth for site copy and pricing.
 *
 * Prices live ONLY here. Every other file imports from this module
 * and never hard-codes a price.
 */

export const SITE = {
  name: "CrewDesk",
  tagline: "Hire an AI crew for one job.",
  /** Placeholder domain — not claimed live. */
  url: "https://crewdesk.app",
} as const;

export const FREE_DAILY_LIMIT = 5;

export type PlanId = "free" | "starter" | "growth";

export interface Plan {
  id: PlanId;
  name: string;
  monthlyPriceUsd: number;
  /** Billed-monthly price shown when the annual option is chosen, if any. */
  annualMonthlyPriceUsd: number | null;
  billingNote: string;
  repliesPerDay: number;
  inboxes: number;
  features: string[];
  cta: string;
  comingSoon: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    monthlyPriceUsd: 0,
    annualMonthlyPriceUsd: null,
    billingNote: "Free forever",
    repliesPerDay: 5,
    inboxes: 1,
    features: [
      "5 replies a day, forever",
      "1 connected inbox",
      "Triage, Reply, Approve — founder approves every send",
    ],
    cta: "Start free",
    comingSoon: false,
  },
  {
    id: "starter",
    name: "Starter",
    monthlyPriceUsd: 19,
    annualMonthlyPriceUsd: 15,
    billingNote: "$15/mo billed annually",
    repliesPerDay: 30,
    inboxes: 2,
    features: [
      "30 replies a day",
      "2 connected inboxes",
      "Triage, Reply, Approve — founder approves every send",
    ],
    cta: "Start free — upgrade when ready",
    comingSoon: false,
  },
  {
    id: "growth",
    name: "Growth",
    monthlyPriceUsd: 49,
    annualMonthlyPriceUsd: null,
    billingNote: "Coming soon",
    repliesPerDay: 30,
    inboxes: 2,
    features: [
      "Everything in Starter",
      "More replies and inboxes when it ships",
    ],
    cta: "Join the waitlist",
    comingSoon: true,
  },
];

export const HERO = {
  headline: "Hire an AI crew for one job. It finishes the work, you approve, it ships.",
  subtext:
    "CrewDesk is a Support Crew for solo founders. It triages your inbox, drafts replies, and waits for your approval — nothing is sent without you.",
  cta: "Start free — 5 replies a day",
} as const;

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ: FaqItem[] = [
  {
    question: "What is CrewDesk?",
    answer:
      "CrewDesk is a Support Crew for solo founders: an AI crew hired for one job — handling your customer inbox. It triages incoming messages, drafts replies, and escalates what it cannot handle. You approve every reply before it is sent.",
  },
  {
    question: "Are replies sent without my approval?",
    answer:
      "No. Nothing is ever sent without your approval. The crew drafts the reply, you review it, and only then does it ship. Approve, edit, or reject — the final call is always yours.",
  },
  {
    question: "What is a channel?",
    answer:
      "A channel is one connected inbox account — for example, one support email inbox. The Free plan includes 1 inbox; Starter includes 2.",
  },
  {
    question: "How is my quota counted?",
    answer:
      "Quota is counted per reply actually sent. Drafts, triage, and rejected replies do not use quota — only replies you approve and send.",
  },
  {
    question: "Is my data used for training?",
    answer:
      "No. Your data is not used for training. Demo data shown on this site is separate and is not real customer data.",
  },
];

export const DEMO_NOTICE = "Demo data — not real customers";
