// CrewDesk — POST /api/crew/approve (demo only).
// Human approval gate: approve / edit / reject a draft.
// Demo only — no real email is ever sent from this endpoint.

import { NextResponse } from "next/server";

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

  return NextResponse.json({
    ok: true,
    demo: true,
    threadId,
    action: approveAction,
    status: STATUS_BY_ACTION[approveAction],
    note: "Demo only — no real email was sent.",
  });
}
