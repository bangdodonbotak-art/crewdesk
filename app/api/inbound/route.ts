// CrewDesk — POST /api/inbound (demo only).
// Simulates an email forwarded into the crew inbox.
// This is NOT a real Gmail webhook — wire it to a real inbound email
// service in phase 2.

import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const { from, subject, body: emailBody } = body as {
    from?: unknown;
    subject?: unknown;
    body?: unknown;
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

  return NextResponse.json({
    ok: true,
    demo: true,
    threadId: `demo-inbound-${Date.now()}`,
    note: "Demo inbound — wire this to a real inbound email service in phase 2.",
  });
}
