// CrewDesk — POST /api/crew/run
// Runs one crew step (triage or draft) on a thread owned by the caller.
// Real threads: reads the thread + knowledge base from Supabase, calls the
// free model (TokenHarbor DeepSeek, server-side), writes the result + audit
// log to the DB. If the model is unavailable, the labelled DEMO state
// machine is the fallback — never presented as an AI answer.
// Demo threads (id starts with "demo-"): the old demo response, labelled.

import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { callModel, extractJson } from "@/lib/crew/model";
import { kbSearch, logStep, requireUser } from "@/lib/crew/db";
import { nextStep, type CrewStep } from "@/lib/crew/graph";
import { CREW_RULES } from "@/lib/crew/roles";

const VALID_STEPS = ["triage", "draft"] as const;
type CrewRunStep = (typeof VALID_STEPS)[number];

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

interface TriageJson {
  category?: string;
  priority?: string;
  sentiment?: number;
  summary?: string;
}

function keywordTriage(subject: string, body: string): TriageJson {
  const text = `${subject} ${body}`.toLowerCase();
  if (/refund|charged twice|double charge|money back/.test(text))
    return { category: "refund", priority: "P1", sentiment: -1 };
  if (/bug|blank|won't load|crash|error|broken/.test(text))
    return { category: "bug", priority: "P0", sentiment: -1 };
  if (/price|cost|plan|pricing|how much/.test(text))
    return { category: "pricing", priority: "P2", sentiment: 0 };
  if (/disappoint|slow|angry|terrible|unacceptable/.test(text))
    return { category: "complaint", priority: "P1", sentiment: -1 };
  if (/how (do|can|to)|where|invite|teammate/.test(text))
    return { category: "how-to", priority: "P2", sentiment: 0 };
  return { category: "pre-sales", priority: "P2", sentiment: 0 };
}

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

  // Demo threads keep the old labelled demo behaviour.
  if (threadId.startsWith("demo-")) {
    const result =
      runStep === "triage"
        ? "Demo triage result — no real email processed."
        : "Demo draft result — no real email processed.";
    return NextResponse.json({ ok: true, demo: true, threadId, step: runStep, result });
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

  const kb = await kbSearch(
    supabase,
    user.id,
    `${thread.subject ?? ""} ${thread.body ?? ""}`,
  );
  const kbContext =
    kb.length > 0
      ? kb.map((k) => `Q: ${k.question}\nA: ${k.answer}`).join("\n\n")
      : "The knowledge base is empty.";

  if (runStep === "triage") {
    const model = await callModel(
      "You are the Triage agent of a support crew. Classify the customer message. Reply with JSON only: {\"category\": one of billing|bug|how-to|pricing|refund|complaint|pre-sales, \"priority\": one of P0|P1|P2|P3, \"sentiment\": -1, 0 or 1, \"summary\": one sentence}. Never invent facts.",
      `Subject: ${thread.subject ?? ""}\n\n${thread.body ?? ""}`,
      300,
    );
    let triage: TriageJson;
    let source: "live" | "demo-fallback";
    if (model.ok) {
      const parsed = extractJson<TriageJson>(model.text);
      triage = parsed ?? keywordTriage(thread.subject ?? "", thread.body ?? "");
      source = "live";
    } else {
      triage = keywordTriage(thread.subject ?? "", thread.body ?? "");
      source = "demo-fallback";
    }
    const category = CATEGORIES.includes(triage.category as (typeof CATEGORIES)[number])
      ? (triage.category as (typeof CATEGORIES)[number])
      : "pre-sales";
    const priority = PRIORITIES.includes(triage.priority as (typeof PRIORITIES)[number])
      ? (triage.priority as (typeof PRIORITIES)[number])
      : "P2";
    const sentiment =
      triage.sentiment === -1 || triage.sentiment === 0 || triage.sentiment === 1
        ? triage.sentiment
        : 0;
    const next = nextStep((thread.status as CrewStep) ?? "received", "triage");
    await supabase
      .from("threads")
      .update({
        category,
        priority,
        sentiment,
        summary: triage.summary ?? null,
        status: next === "received" ? "received" : next,
      })
      .eq("id", threadId);
    await logStep(
      supabase,
      threadId,
      "triage",
      `Classified as ${category} / ${priority}, sentiment ${sentiment} (${source}).`,
      "crew:triage",
      "ok",
      { source, model: source === "live" ? "deepseek-v4.1-flash:free" : null },
    );
    return NextResponse.json({
      ok: true,
      threadId,
      step: "triage",
      source,
      result: { category, priority, sentiment, summary: triage.summary ?? null },
    });
  }

  // draft
  if ((thread.status as string) !== "triaged" && (thread.status as string) !== "drafted") {
    return NextResponse.json(
      { ok: false, error: "thread_must_be_triaged_first" },
      { status: 409 },
    );
  }
  const model = await callModel(
    [
      "You are the Reply agent of a support crew.",
      ...CREW_RULES.slice(0, 3),
      "Write a short, helpful reply to the customer using ONLY the knowledge base below.",
      "If the knowledge base has no answer, reply with exactly: ESCALATE",
      "Knowledge base:",
      kbContext,
    ].join("\n"),
    `Subject: ${thread.subject ?? ""}\n\nCustomer message:\n${thread.body ?? ""}`,
    600,
  );
  let draft: string;
  let draftSource: "ai" | "template";
  let source: "live" | "demo-fallback";
  let kbConfidence = 0;
  if (model.ok && model.text.trim() !== "ESCALATE") {
    draft = model.text.trim();
    draftSource = "ai";
    source = "live";
    kbConfidence = kb.length > 0 ? 0.8 : 0;
  } else if (model.ok) {
    // Model says the KB has no answer — escalate, do not guess.
    await supabase
      .from("threads")
      .update({ status: "escalated" })
      .eq("id", threadId);
    await logStep(supabase, threadId, "draft", "KB has no answer — escalated to a human.", "crew:reply", "ok", { source: "live" });
    return NextResponse.json({
      ok: true,
      threadId,
      step: "draft",
      source: "live",
      result: { escalated: true, note: "Knowledge base has no answer — escalated to a human." },
    });
  } else {
    draft =
      "Hi — thanks for writing in. I've read your message and I'm looking into it. A human from our team will follow up with an answer shortly.";
    draftSource = "template";
    source = "demo-fallback";
    kbConfidence = 0;
  }
  const next = nextStep((thread.status as CrewStep) ?? "triaged", "draft");
  void next;
  await supabase
    .from("threads")
    .update({
      draft_text: draft,
      draft_source: draftSource,
      kb_confidence: kbConfidence,
      // A written draft always waits for the founder (human approval gate).
      status: "awaiting_approval",
    })
    .eq("id", threadId);
  await logStep(
    supabase,
    threadId,
    "draft",
    `Draft written (${source}, ${draftSource}). Awaiting human approval.`,
    "crew:reply",
    "ok",
    { source, draftSource },
  );
  return NextResponse.json({
    ok: true,
    threadId,
    step: "draft",
    source,
    result: { draft, draftSource, kbConfidence },
  });
}
