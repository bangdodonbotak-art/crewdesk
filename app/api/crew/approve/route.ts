// CrewDesk — POST /api/crew/approve
// Human approval gate: approve / edit / reject a draft.
// Real threads: auth required, quota checked server-side BEFORE sending
// (Free 5/day, Starter 30/day — from lib/site-data.ts), the sent counter
// increments atomically via RPC only when approve → sent, and every
// decision is written to `approvals` + the audit log (`steps`).
// "Sent" here means "approved to send" — this round does NOT send a real
// email to the customer (no sender credential is wired yet). The inbox
// page says so honestly.
// Demo threads (id starts with "demo-"): the old demo response, labelled.

import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getQuota, incrementUsage, logStep, requireUser } from "@/lib/crew/db";
import { nextStep, type CrewStep } from "@/lib/crew/graph";

const VALID_ACTIONS = ["approve", "edit", "reject"] as const;
type ApproveAction = (typeof VALID_ACTIONS)[number];

const STATUS_BY_ACTION: Record<ApproveAction, "sent" | "rejected" | "awaiting_approval"> = {
  approve: "sent",
  edit: "awaiting_approval",
  reject: "rejected",
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const { threadId, action, editedDraft } = body as {
    threadId?: unknown;
    action?: unknown;
    editedDraft?: unknown;
  };

  if (typeof threadId !== "string" || threadId.trim() === "") {
    return NextResponse.json({ ok: false, error: "threadId is required." }, { status: 400 });
  }
  if (typeof action !== "string" || !(VALID_ACTIONS as readonly string[]).includes(action)) {
    return NextResponse.json(
      { ok: false, error: 'action must be "approve", "edit", or "reject".' },
      { status: 400 },
    );
  }
  if (editedDraft !== undefined && typeof editedDraft !== "string") {
    return NextResponse.json(
      { ok: false, error: "editedDraft must be a string." },
      { status: 400 },
    );
  }
  const approveAction = action as ApproveAction;

  // Demo threads keep the old labelled demo behaviour.
  if (threadId.startsWith("demo-")) {
    return NextResponse.json({
      ok: true,
      demo: true,
      threadId,
      action: approveAction,
      status: STATUS_BY_ACTION[approveAction],
      note: "Demo only — no real email was sent.",
    });
  }

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

  const { data: thread, error: threadError } = await supabase
    .from("threads")
    .select("*")
    .eq("id", threadId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (threadError || !thread) {
    return NextResponse.json({ ok: false, error: "thread_not_found" }, { status: 404 });
  }

  const next = nextStep((thread.status as CrewStep) ?? "received", approveAction);
  const targetStatus = STATUS_BY_ACTION[approveAction];
  // A decided thread cannot be approved twice (that would double-charge quota).
  if ((thread.status as string) === "sent" || (thread.status as string) === "rejected") {
    return NextResponse.json(
      { ok: false, error: `thread_already_${thread.status}` },
      { status: 409 },
    );
  }
  if (next !== targetStatus && !(approveAction === "edit" && next === "awaiting_approval")) {
    return NextResponse.json(
      { ok: false, error: `cannot_${approveAction}_thread_in_status_${thread.status}` },
      { status: 409 },
    );
  }

  // Quota: checked server-side BEFORE an approve can send.
  let quota = null as Awaited<ReturnType<typeof getQuota>> | null;
  if (approveAction === "approve") {
    quota = await getQuota(supabase, user.id);
    if (quota.remaining <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "quota_exceeded",
          quota: { used: quota.used, limit: quota.limit, plan: quota.plan },
        },
        { status: 429 },
      );
    }
  }

  const finalDraft =
    typeof editedDraft === "string" && editedDraft.trim() !== ""
      ? editedDraft
      : (thread.draft_text as string | null) ?? "";

  const { error: approvalError } = await supabase.from("approvals").insert({
    thread_id: threadId,
    action: approveAction,
    edited_draft: finalDraft || null,
    decided_by: user.id,
  });
  if (approvalError) {
    return NextResponse.json({ ok: false, error: "approval_write_failed" }, { status: 500 });
  }

  // Only a sent reply consumes quota — increment atomically via RPC.
  let usedAfter = quota?.used ?? null;
  if (approveAction === "approve") {
    const inc = await incrementUsage(user.id);
    if (!inc.ok) {
      return NextResponse.json({ ok: false, error: "quota_increment_failed" }, { status: 500 });
    }
    usedAfter = inc.count ?? null;
  }

  await supabase
    .from("threads")
    .update({
      status: targetStatus,
      draft_text: finalDraft || thread.draft_text,
    })
    .eq("id", threadId);
  await logStep(
    supabase,
    threadId,
    approveAction,
    approveAction === "approve"
      ? "Approved by founder — marked sent (approved to send; no real email is sent yet in this round)."
      : approveAction === "edit"
        ? "Draft edited by founder — back to awaiting approval."
        : "Rejected by founder — nothing sent, no quota used.",
    `user:${user.id}`,
    "ok",
    { quotaUsedAfter: usedAfter },
  );

  return NextResponse.json({
    ok: true,
    threadId,
    action: approveAction,
    status: targetStatus,
    quota: usedAfter !== null && quota
      ? { used: usedAfter, limit: quota.limit, plan: quota.plan }
      : undefined,
    note:
      approveAction === "approve"
        ? "Approved to send — no real email is sent yet in this round (no sender credential wired)."
        : undefined,
  });
}
