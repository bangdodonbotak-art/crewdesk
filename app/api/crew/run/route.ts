// CrewDesk — POST /api/crew/run (demo only).
// Runs a crew step (triage or draft) on a demo thread. No real email is
// processed and no AI model is called in the MVP.

import { NextResponse } from "next/server";

const VALID_STEPS = ["triage", "draft"] as const;
type CrewRunStep = (typeof VALID_STEPS)[number];

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const { threadId, step } = body as { threadId?: unknown; step?: unknown };

  if (typeof threadId !== "string" || threadId.trim() === "") {
    return NextResponse.json({ ok: false, error: "threadId is required." }, { status: 400 });
  }
  if (typeof step !== "string" || !(VALID_STEPS as readonly string[]).includes(step)) {
    return NextResponse.json(
      { ok: false, error: 'step must be "triage" or "draft".' },
      { status: 400 },
    );
  }

  const runStep = step as CrewRunStep;
  const result =
    runStep === "triage"
      ? "Demo triage result — no real email processed."
      : "Demo draft result — no real email processed.";

  return NextResponse.json({
    ok: true,
    demo: true,
    threadId,
    step: runStep,
    result,
  });
}
