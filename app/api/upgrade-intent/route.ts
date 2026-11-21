// CrewDesk — POST /api/upgrade-intent
// Records that a user intends to upgrade (the kill-criteria metric from
// blueprint §4: <100 users OR <10 paying = kill/pivot). No payment is
// taken; Stripe is NOT in the MVP.
// Signed-in users are recorded with their user_id; signed-out visitors
// may record an email + plan only. Writes go through the service-role
// client so signed-out intents are accepted — the row carries no
// privileged data. Honest 503 when Supabase is not configured.

import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseServer } from "@/lib/supabase/server";
import { requireUser } from "@/lib/crew/db";

const VALID_PLANS = ["starter", "growth"] as const;
type UpgradePlan = (typeof VALID_PLANS)[number];

// Waitlist guardrails (ensemble): the endpoint accepts signed-out
// visitors, so a bare insert would fill the table with garbage and
// duplicates. Validate the format server-side (the form also validates
// client-side) and de-dup on (email, plan) — return ok + duplicate
// instead of a second row. No unique constraint is added to the table
// (no schema changes in this round); the select-then-insert is
// best-effort. Full bot-proofing (IP rate limit / CAPTCHA) needs a new
// service and is an open TODO, not part of this build.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const { plan, email } = body as { plan?: unknown; email?: unknown };

  if (typeof plan !== "string" || !(VALID_PLANS as readonly string[]).includes(plan)) {
    return NextResponse.json(
      { ok: false, error: 'plan must be "starter" or "growth".' },
      { status: 400 },
    );
  }
  if (email !== undefined && typeof email !== "string") {
    return NextResponse.json({ ok: false, error: "email must be a string." }, { status: 400 });
  }
  const cleanEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  if (cleanEmail !== "" && (cleanEmail.length > 254 || !EMAIL_RE.test(cleanEmail))) {
    return NextResponse.json(
      { ok: false, error: "email must be a valid email address." },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "supabase_not_configured" },
      { status: 503 },
    );
  }

  // Best effort: attach the user_id when the caller is signed in.
  let userId: string | null = null;
  try {
    const server = await getSupabaseServer();
    const user = await requireUser(server);
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  // De-dup: one row per (email, plan). A repeat submit returns ok +
  // duplicate instead of a second row (the form shows "already on the
  // list" — the caller never learns whether the address existed).
  if (cleanEmail !== "") {
    const { data: existing } = await admin
      .from("upgrade_intents")
      .select("id")
      .eq("email", cleanEmail)
      .eq("plan", plan as UpgradePlan)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({
        ok: true,
        recorded: false,
        duplicate: true,
        plan: plan as UpgradePlan,
        note: "Already on the waitlist for this plan.",
      });
    }
  }

  const { error } = await admin.from("upgrade_intents").insert({
    user_id: userId,
    plan: plan as UpgradePlan,
    email: cleanEmail !== "" ? cleanEmail : null,
    status: "new",
  });
  if (error) {
    return NextResponse.json({ ok: false, error: "upgrade_intent_write_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    recorded: true,
    plan: plan as UpgradePlan,
    note: "Upgrade intent recorded — no payment taken. Stripe is NOT in the MVP.",
  });
}
