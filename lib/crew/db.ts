// CrewDesk — shared server helpers for API routes (auth + quota + audit).
// Server-only. Quota limits come from lib/site-data.ts (PLANS) — never
// hard-coded in a route.

import type { SupabaseClient } from "@supabase/supabase-js";
import { PLANS } from "@/lib/site-data";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface AuthedUser {
  id: string;
  email: string | null;
}

/** Resolve the logged-in user from the cookie-aware server client. */
export async function requireUser(
  supabase: SupabaseClient | null,
): Promise<AuthedUser | null> {
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? null };
}

/** Daily quota for a user: plan from profiles, used from usage_daily. */
export async function getQuota(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ plan: string; limit: number; used: number; remaining: number }> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();
  const planId = (profile?.plan as string | undefined) ?? "free";
  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[0];
  const limit = plan.repliesPerDay;
  const today = new Date().toISOString().slice(0, 10);
  const { data: usage } = await supabase
    .from("usage_daily")
    .select("sent_count")
    .eq("user_id", userId)
    .eq("day", today)
    .maybeSingle();
  const used = usage?.sent_count ?? 0;
  return { plan: planId, limit, used, remaining: Math.max(0, limit - used) };
}

/** Atomically increment the sent counter (RPC, server-only admin client). */
export async function incrementUsage(
  userId: string,
): Promise<{ ok: boolean; count?: number }> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false };
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await admin.rpc("increment_usage", {
    p_user_id: userId,
    p_day: today,
  });
  if (error) return { ok: false };
  return { ok: true, count: data as number };
}

/** Append one audit-log row to `steps` (best effort — never throws). */
export async function logStep(
  supabase: SupabaseClient,
  threadId: string,
  step: string,
  detail: string,
  actor: string,
  status: "pending" | "ok" | "failed" = "ok",
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    await supabase.from("steps").insert({
      thread_id: threadId,
      step,
      detail,
      actor,
      status,
      metadata,
    });
  } catch {
    // Audit logging must never break the request it observes.
  }
}

/** Minimal knowledge-base search: substring match over the user's items. */
export async function kbSearch(
  supabase: SupabaseClient,
  userId: string,
  query: string,
): Promise<{ question: string; answer: string }[]> {
  const { data } = await supabase
    .from("knowledge_items")
    .select("question, answer")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(50);
  const items = (data ?? []) as { question: string; answer: string }[];
  const q = query.toLowerCase();
  const words = q.split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  const scored = items
    .map((item) => {
      const hay = `${item.question} ${item.answer}`.toLowerCase();
      const hits = words.filter((w) => hay.includes(w)).length;
      return { item, hits };
    })
    .filter((s) => s.hits > 0 || words.length === 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 5);
  return scored.map((s) => s.item);
}
