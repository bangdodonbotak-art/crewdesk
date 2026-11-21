// CrewDesk — POST /api/upgrade-intent (demo only).
// Records that a user intends to upgrade. No payment is taken.
// Stripe is NOT in the MVP.

import { NextResponse } from "next/server";

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

  const upgradePlan = plan as UpgradePlan;

  return NextResponse.json({
    ok: true,
    demo: true,
    plan: upgradePlan,
    note: "Upgrade intent recorded (demo) — no payment taken. Stripe is NOT in the MVP.",
  });
}
