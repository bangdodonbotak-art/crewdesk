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

  const { error } = await admin.from("upgrade_intents").insert({
    user_id: userId,
    plan: plan as UpgradePlan,
    email: typeof email === "string" && email.trim() !== "" ? email.trim() : null,
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
