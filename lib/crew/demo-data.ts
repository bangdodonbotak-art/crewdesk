// DEMO DATA — not real customers. Never mix with real threads.
import { FREE_DAILY_LIMIT } from "@/lib/site-data";

export interface DemoThreadStep {
  triage: string;
  reply: string;
  approve: string;
}

export interface DemoThread {
  id: string;
  subject: string;
  from: string;
  body: string;
  category: string;
  priority: "P0" | "P1" | "P2" | "P3";
  sentiment: number; // -1 (negative) .. 0 (neutral) .. 1 (positive)
  status: "received" | "triaged" | "drafted" | "awaiting_approval" | "sent" | "escalated" | "rejected";
  createdAt: string;
  draft: string;
  steps: DemoThreadStep;
  isDemo: true;
}

export const DEMO_THREADS: DemoThread[] = [
  {
    id: "demo-1",
    subject: "Refund request for my Starter plan",
    from: "maya@example.com",
    body: "Hi, I was charged for the Starter plan yesterday but I meant to stay on the free plan. Can I get a refund? I haven't used any paid features yet.",
    category: "billing",
    priority: "P1",
    sentiment: -1,
    status: "awaiting_approval",
    createdAt: "2026-11-21T08:12:00+07:00",
    draft:
      "Hi Maya, sorry about the mix-up. I've started a refund for your Starter charge — it should land back on your card within 5–10 business days, and your account is back on the free plan. Let me know if you don't see it by then.",
    steps: {
      triage: "Classified as billing / refund, priority P1, negative sentiment.",
      reply: "Drafted refund reply from the billing knowledge-base article.",
      approve: "Awaiting human approval — refund replies always need a human check.",
    },
    isDemo: true,
  },
  {
    id: "demo-2",
    subject: "How much does CrewDesk cost?",
    from: "ben@example.com",
    body: "Hi! I'm comparing support tools for my small shop. What plans do you offer and what are the limits on the free plan?",
    category: "pricing",
    priority: "P2",
    sentiment: 1,
    status: "sent",
    createdAt: "2026-11-21T09:03:00+07:00",
    draft:
      "Hi Ben, thanks for asking! The free plan covers 5 sent replies a day with one AI crew member. Paid plans add more replies and crew seats — you can see the current plans on our pricing page. Happy to help you pick the right one.",
    steps: {
      triage: "Classified as pricing / pre-sales, priority P2, positive sentiment.",
      reply: "Drafted pricing reply — prices taken from the site data only, nothing invented.",
      approve: "Approved by human; reply sent.",
    },
    isDemo: true,
  },
  {
    id: "demo-3",
    subject: "Bug: my drafts keep disappearing",
    from: "sara@example.com",
    body: "Every time I refresh the dashboard, the draft I was editing is gone. This happened three times today. I'm on Chrome on Windows. Please fix this.",
    category: "bug",
    priority: "P0",
    sentiment: -1,
    status: "escalated",
    createdAt: "2026-11-21T09:47:00+07:00",
    draft:
      "Hi Sara, I'm sorry — losing work three times is frustrating. I've escalated this to our team with your browser details so we can reproduce it. As a workaround, please keep the tab open until the draft is approved. We'll update you as soon as we have a fix.",
    steps: {
      triage: "Classified as bug report, priority P0, negative sentiment.",
      reply: "Drafted acknowledgement; no fix promised, only escalation.",
      approve: "Escalated to a human — P0 bugs are never auto-answered.",
    },
    isDemo: true,
  },
  {
    id: "demo-4",
    subject: "How do I add a teammate to my crew?",
    from: "dimas@example.com",
    body: "I just signed up and I want my co-founder to approve replies too. Where do I invite her?",
    category: "how-to",
    priority: "P2",
    sentiment: 0,
    status: "drafted",
    createdAt: "2026-11-21T10:25:00+07:00",
    draft:
      "Hi Dimas, you can invite your co-founder from Settings → Team → Invite. She'll get an email invite and, once she accepts, she can approve replies just like you. Let me know if the invite doesn't arrive!",
    steps: {
      triage: "Classified as how-to / onboarding, priority P2, neutral sentiment.",
      reply: "Drafted step-by-step reply from the onboarding knowledge-base article.",
      approve: "Draft ready, awaiting human approval.",
    },
    isDemo: true,
  },
  {
    id: "demo-5",
    subject: "Very disappointed — replies are too slow",
    from: "rina@example.com",
    body: "I waited two days for a reply to my last email and the answer didn't even solve my problem. This is not the service I signed up for. I want someone senior to look at this.",
    category: "complaint",
    priority: "P1",
    sentiment: -1,
    status: "awaiting_approval",
    createdAt: "2026-11-21T11:40:00+07:00",
    draft:
      "Hi Rina, I'm really sorry — a two-day wait and an answer that didn't help is not good enough. I've flagged this for a senior team member to review your original issue personally. Thank you for telling us plainly; we'll follow up with a proper fix.",
    steps: {
      triage: "Classified as complaint, priority P1, negative sentiment.",
      reply: "Drafted apology reply; no promises beyond a senior review.",
      approve: "Awaiting human approval — complaints always need a human check.",
    },
    isDemo: true,
  },
  {
    id: "demo-6",
    subject: "Can CrewDesk handle WhatsApp messages too?",
    from: "alex@example.com",
    body: "We get most customer questions on WhatsApp, not email. Does CrewDesk work there, or is it email only for now? If it's coming, when?",
    category: "pre-sales",
    priority: "P2",
    sentiment: 0,
    status: "triaged",
    createdAt: "2026-11-21T13:15:00+07:00",
    draft:
      "Hi Alex, great question. Right now CrewDesk handles email support; WhatsApp is on our roadmap but we don't have a launch date to share yet. If you'd like, I can note your interest and let you know as soon as it's available.",
    steps: {
      triage: "Classified as pre-sales / feature question, priority P2, neutral sentiment.",
      reply: "Drafted reply — no launch date invented; WhatsApp is roadmap-only.",
      approve: "Triaged, draft not yet written.",
    },
    isDemo: true,
  },
];

export interface DemoKbItem {
  id: string;
  question: string;
  answer: string;
  updatedAt: string;
}

export const DEMO_KB: DemoKbItem[] = [
  {
    id: "kb-1",
    question: "How do I request a refund?",
    answer:
      "Refunds are handled by a human. Reply to the customer, confirm the charge and that no paid features were used, and escalate the refund for approval. Refunds land within 5–10 business days.",
    updatedAt: "2026-11-21T07:00:00+07:00",
  },
  {
    id: "kb-2",
    question: "What are the CrewDesk plans and limits?",
    answer:
      "The free plan covers 5 sent replies per day. Paid plans add more replies and crew seats. Always quote prices from the site data only — never invent a price.",
    updatedAt: "2026-11-21T07:00:00+07:00",
  },
  {
    id: "kb-3",
    question: "How do I invite a teammate?",
    answer:
      "Go to Settings → Team → Invite, enter their email, and they receive an invite. Once accepted, they can approve replies.",
    updatedAt: "2026-11-21T07:00:00+07:00",
  },
  {
    id: "kb-4",
    question: "What should the crew do when it cannot answer?",
    answer:
      "Escalate to a human with full context. Never guess, never promise a fix or a date the knowledge base does not state.",
    updatedAt: "2026-11-21T07:00:00+07:00",
  },
];

/** Demo quota state: 2 of 5 free replies used today. Limit mirrors FREE_DAILY_LIMIT. */
export const DEMO_QUOTA = { used: 2, limit: FREE_DAILY_LIMIT };
