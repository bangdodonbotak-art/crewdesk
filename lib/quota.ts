// CrewDesk — Quota: free daily limit, counted per SENT reply only.
// Drafts, regenerations, and escalations never consume quota.

import { FREE_DAILY_LIMIT } from "@/lib/site-data";

export function quotaRemaining(used: number, limit: number = FREE_DAILY_LIMIT): number {
  return Math.max(0, limit - used);
}

export type QuotaStatus = "ok" | "low" | "exceeded";

export function quotaStatus(used: number, limit: number = FREE_DAILY_LIMIT): QuotaStatus {
  const remaining = quotaRemaining(used, limit);
  if (remaining <= 0) return "exceeded";
  if (remaining <= 1) return "low";
  return "ok";
}

export type QuotaAction = "send" | "draft" | "regenerate" | "escalate";

/** Only a sent reply consumes quota. */
export function countsAgainstQuota(action: QuotaAction): boolean {
  return action === "send";
}
