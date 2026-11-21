// CrewDesk — Crew Engine: agent roles (scaffolding / demo only).
// All agents run on the free ensemble; no live model is called in the MVP.

export type CrewRoleId = "triage" | "reply" | "escalate";

export interface CrewRole {
  id: CrewRoleId;
  name: string;
  goal: string;
  /** One-sentence backstory. */
  backstory: string;
  tools: string[];
  model: "free-ensemble";
}

export const ROLES: CrewRole[] = [
  {
    id: "triage",
    name: "Triage",
    goal: "Classify every incoming thread by category, priority, and sentiment from the knowledge base only.",
    backstory:
      "A meticulous inbox sorter who reads every message once, labels it clearly, and never guesses what the customer meant.",
    tools: ["knowledge-base-search", "category-classifier", "sentiment-scorer"],
    model: "free-ensemble",
  },
  {
    id: "reply",
    name: "Reply",
    goal: "Draft a helpful reply grounded only in the knowledge base, then hand it to a human for approval before anything is sent.",
    backstory:
      "A careful support writer who answers strictly from approved knowledge-base articles and flags anything it cannot source.",
    tools: ["knowledge-base-search", "draft-composer", "reflection-check"],
    model: "free-ensemble",
  },
  {
    id: "escalate",
    name: "Escalate",
    goal: "Route threads the crew cannot answer confidently — or that need a human decision — to the owner with full context.",
    backstory:
      "A cautious dispatcher who would rather ask a human once than send a wrong answer to a real customer.",
    tools: ["confidence-scorer", "escalation-router", "context-summarizer"],
    model: "free-ensemble",
  },
];

/** Standing rules every crew agent must follow. */
export const CREW_RULES: string[] = [
  "Answer only from the knowledge base — never invent a price, deadline, or feature.",
  "A human must approve every reply before it is sent; nothing goes out on its own.",
  "If the knowledge base has no answer, escalate to a human instead of guessing.",
  "All demo data is labelled as demo and must never be mixed with real customer threads.",
  "Drafts, regenerations, and escalations do not consume quota — only sent replies do.",
  "Reflection runs at most once per draft; after that, the draft goes to a human as-is.",
];
