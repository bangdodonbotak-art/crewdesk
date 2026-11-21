// CrewDesk — /api/settings (GET / POST)
// GET: the signed-in user's plan + today's quota + inbound address +
// whether an inbound token exists + the data-consent flag. Signed-out
// visitors get { signedIn: false } with the public inbound address only.
// POST { action: "rotate-token" }: create (or rotate) the per-user inbound
// token. The token value is returned ONCE in the response — the page must
// show it once and never store it in localStorage.
// POST { action: "set-consent", consent: boolean }: the written consent
// for sending real customer data to the free model provider.

import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getQuota, requireUser } from "@/lib/crew/db";

const INBOUND_ADDRESS =
  process.env.NEXT_PUBLIC_CREWDESK_INBOUND_ADDRESS ??
  "inbox@inbound.crewdesk.example";

export async function GET() {
  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({
      ok: true,
      configured: false,
      signedIn: false,
      inboundAddress: INBOUND_ADDRESS,
    });
  }
  const user = await requireUser(supabase);
  if (!user) {
    return NextResponse.json({
      ok: true,
      configured: true,
      signedIn: false,
      inboundAddress: INBOUND_ADDRESS,
    });
  }
  const quota = await getQuota(supabase, user.id);
  const { data: profile } = await supabase
    .from("profiles")
    .select("data_consent")
    .eq("id", user.id)
    .maybeSingle();
  const { data: inbox } = await supabase
    .from("inboxes")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  return NextResponse.json({
    ok: true,
    configured: true,
    signedIn: true,
    plan: quota.plan,
    quotaUsed: quota.used,
    quotaLimit: quota.limit,
    inboundAddress: INBOUND_ADDRESS,
    hasInboundToken: Boolean(inbox),
    dataConsent: (profile?.data_consent as boolean | undefined) ?? false,
  });
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "supabase_not_configured" },
      { status: 503 },
    );
  }
  const user = await requireUser(supabase);
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
  const { action, consent } = body as { action?: unknown; consent?: unknown };

  if (action === "rotate-token") {
    const token = randomBytes(32).toString("hex");
    const { error } = await supabase.from("inboxes").upsert(
      {
        user_id: user.id,
        address: INBOUND_ADDRESS,
        token,
      },
      { onConflict: "user_id" },
    );
    if (error) {
      return NextResponse.json({ ok: false, error: "token_rotate_failed" }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      token,
      note: "Copy this token now — it is shown only once. Use it as Authorization: Bearer <token> on POST /api/inbound.",
    });
  }

  if (action === "set-consent") {
    if (typeof consent !== "boolean") {
      return NextResponse.json({ ok: false, error: "consent must be a boolean." }, { status: 400 });
    }
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, email: user.email, data_consent: consent }, { onConflict: "id" });
    if (error) {
      return NextResponse.json({ ok: false, error: "consent_write_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, dataConsent: consent });
  }

  return NextResponse.json(
    { ok: false, error: 'action must be "rotate-token" or "set-consent".' },
    { status: 400 },
  );
}
