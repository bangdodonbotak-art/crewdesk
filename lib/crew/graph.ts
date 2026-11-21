// CrewDesk — Crew Engine: thread state machine (scaffolding / demo only).

export type CrewStep =
  | "received"
  | "triaged"
  | "drafted"
  | "awaiting_approval"
  | "sent"
  | "escalated"
  | "rejected";

/** Reflection loop runs at most once per draft. */
export const MAX_REFLECTION = 1;

export type CrewAction =
  | "triage"
  | "draft"
  | "approve"
  | "edit"
  | "reject"
  | "escalate"
  | "reflect";

/**
 * Advance a thread one step. Returns the current step unchanged for any
 * transition that is not allowed.
 *
 * `reflectionCount` tracks how many times `reflect` has already run for this
 * draft; `reflect` is only allowed from "drafted" and only while
 * reflectionCount < MAX_REFLECTION. A successful reflect stays on "drafted"
 * (the improved draft still needs a human decision) — callers must pass the
 * incremented count on the next call.
 */
export function nextStep(
  current: CrewStep,
  action: CrewAction,
  reflectionCount = 0,
): CrewStep {
  switch (action) {
    case "triage":
      return current === "received" ? "triaged" : current;
    case "draft":
      return current === "triaged" ? "drafted" : current;
    case "reflect":
      return current === "drafted" && reflectionCount < MAX_REFLECTION
        ? "drafted"
        : current;
    case "approve":
      return current === "drafted" || current === "awaiting_approval"
        ? "sent"
        : current;
    case "edit":
      // An edited draft goes back to the human for approval.
      return current === "drafted" || current === "awaiting_approval"
        ? "awaiting_approval"
        : current;
    case "reject":
      return current === "drafted" || current === "awaiting_approval"
        ? "rejected"
        : current;
    case "escalate":
      // Escalation is possible any time before the reply is sent or rejected.
      return current === "received" ||
        current === "triaged" ||
        current === "drafted" ||
        current === "awaiting_approval"
        ? "escalated"
        : current;
    default:
      return current;
  }
}

/**
 * Whether a thread is eligible for auto-approval.
 * Auto-approve is opt-in and OFF by default — this function only checks
 * eligibility, it does not enable auto-approval. Eligible only for P2
 * threads whose answer is 100% sourced from the knowledge base.
 */
export function canAutoApprove(priority: string, kbConfidence: number): boolean {
  return priority === "P2" && kbConfidence >= 1.0;
}
