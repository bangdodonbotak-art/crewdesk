// CrewDesk — POST /api/inbound
// Email in via forward-to: a forwarder (or the founder) POSTs the parsed
// email as JSON. Authenticated by a per-user secret token — either
// `Authorization: Bearer <inbound_token>` or `?token=<inbound_token>`.
// The token lives in `public.inboxes` (created/rotated in Settings).
// This is NOT Gmail OAuth and NOT a Gmail webhook.
// Flow: dedup on message_id → create thread (status received) → audit log
// → triage via the free model (best effort; thread stays `received` if the
// model is unavailable) → return the thread id.

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { callModel, extractJson } from "@/lib/crew/model";

const CATEGORIES = [
  "billing",
  "bug",
  "how-to",
  "pricing",
  "refund",
  "complaint",
  "pre-sales",
] as const;
const PRIORITIES = ["P0", "P1", "P2", "P3"] as const;

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "supabase_not_configured" },
      { status: 503 },
    );
  }

  // Token auth — never accept an inbound email without one (open endpoint
  // = spam). Header wins over the query param.
  const url = new URL(request.url);
  const authHeader = request.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  const token = bearer || url.searchParams.get("token") || "";
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "missing_inbound_token" },
      { status: 401 },
    );
  }

  const { data: inbox, error: inboxError } = await admin
    .from("inboxes")
    .select("user_id")
    .eq("token", token)
    .maybeSingle();
  if (inboxError || !inbox) {
    return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 401 });
  }
  const userId = inbox.user_id as string;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const { from, subject, body: emailBody, message_id } = body as {
    from?: unknown;
    subject?: unknown;
    body?: unknown;
    message_id?: unknown;
  };

  if (typeof from !== "string" || from.trim() === "") {
    return NextResponse.json({ ok: false, error: "from is required." }, { status: 400 });
  }
  if (typeof subject !== "string" || subject.trim() === "") {
    return NextResponse.json({ ok: false, error: "subject is required." }, { status: 400 });
  }
  if (typeof emailBody !== "string" || emailBody.trim() === "") {
    return NextResponse.json({ ok: false, error: "body is required." }, { status: 400 });
  }
  if (message_id !== undefined && typeof message_id !== "string") {
    return NextResponse.json({ ok: false, error: "message_id must be a string." }, { status: 400 });
  }

  // Dedup: the same forwarded email must never create two threads.
  if (typeof message_id === "string" && message_id.trim() !== "") {
    const { data: existing } = await admin
      .from("threads")
      .select("id")
      .eq("user_id", userId)
      .eq("message_id", message_id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({
        ok: true,
        threadId: existing.id,
        deduped: true,
        note: "Message already received — returning the existing thread.",
      });
    }
  }

  const { data: thread, error: insertError } = await admin
    .from("threads")
    .insert({
      user_id: userId,
      subject: subject.trim(),
      from_address: from.trim(),
      body: emailBody.trim(),
      message_id: typeof message_id === "string" ? message_id : null,
      status: "received",
    })
    .select("id")
    .single();
  if (insertError || !thread) {
    return NextResponse.json({ ok: false, error: "thread_create_failed" }, { status: 500 });
  }
  const threadId = thread.id as string;

  await admin.from("steps").insert({
    thread_id: threadId,
    step: "received",
    detail: `Email received via inbound forward from ${from.trim()}.`,
    actor: "inbound",
    status: "ok",
  });

  // Best-effort triage via the free model (short prompt, fast).
  // If the model is unavailable the thread simply stays `received`.
  let triaged = false;
  const model = await callModel(
    "You are the Triage agent of a support crew. Classify the customer message. Reply with JSON only: {\"category\": one of billing|bug|how-to|pricing|refund|complaint|pre-sales, \"priority\": one of P0|P1|P2|P3, \"sentiment\": -1, 0 or 1, \"summary\": one sentence}. Never invent facts.",
    `Subject: ${subject.trim()}\n\n${emailBody.trim()}`,
    300,
  );
  if (model.ok) {
    const parsed = extractJson<{
      category?: string;
      priority?: string;
      sentiment?: number;
      summary?: string;
    }>(model.text);
    if (parsed) {
      const category = CATEGORIES.includes(parsed.category as (typeof CATEGORIES)[number])
        ? parsed.category
        : "pre-sales";
      const priority = PRIORITIES.includes(parsed.priority as (typeof PRIORITIES)[number])
        ? parsed.priority
        : "P2";
      const sentiment =
        parsed.sentiment === -1 || parsed.sentiment === 0 || parsed.sentiment === 1
          ? parsed.sentiment
          : 0;
      await admin
        .from("threads")
        .update({ category, priority, sentiment, summary: parsed.summary ?? null, status: "triaged" })
        .eq("id", threadId);
      await admin.from("steps").insert({
        thread_id: threadId,
        step: "triage",
        detail: `Classified as ${category} / ${priority} (live model).`,
        actor: "crew:triage",
        status: "ok",
      });
      triaged = true;
    }
  }

  return NextResponse.json({
    ok: true,
    threadId,
    triaged,
    note: triaged
      ? "Thread created and triaged."
      : "Thread created. Triage pending — the free model was unavailable.",
  });
}
