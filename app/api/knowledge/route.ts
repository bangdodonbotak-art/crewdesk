// CrewDesk — /api/knowledge (GET / POST / PUT / DELETE)
// CRUD for the signed-in user's knowledge base. Auth required.
// GET seeds 3 starter templates the first time the KB is empty
// (blueprint §6 cold-start rule) — the crew must have something to
// answer from, and the seed is labelled as starter content.

import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { requireUser } from "@/lib/crew/db";

const STARTER_KB = [
  {
    question: "How do I request a refund?",
    answer:
      "Refunds are handled by a human. Reply to the customer, confirm the charge and that no paid features were used, and escalate the refund for approval. Refunds land within 5–10 business days.",
  },
  {
    question: "What are the CrewDesk plans and limits?",
    answer:
      "The free plan covers 5 sent replies per day. Paid plans add more replies and crew seats. Always quote prices from the site data only — never invent a price.",
  },
  {
    question: "What should the crew do when it cannot answer?",
    answer:
      "Escalate to a human with full context. Never guess, never promise a fix or a date the knowledge base does not state.",
  },
];

async function authed() {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "supabase_not_configured", status: 503 } as const;
  const user = await requireUser(supabase);
  if (!user) return { error: "unauthorized", status: 401 } as const;
  return { supabase, user };
}

export async function GET() {
  const auth = await authed();
  if ("error" in auth) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  const { supabase, user } = auth;
  let { data, error } = await supabase
    .from("knowledge_items")
    .select("id, question, answer, updated_at")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("updated_at", { ascending: false });
  if (error) {
    return NextResponse.json({ ok: false, error: "kb_read_failed" }, { status: 500 });
  }
  let seeded = false;
  if ((data ?? []).length === 0) {
    const { data: inserted, error: seedError } = await supabase
      .from("knowledge_items")
      .insert(STARTER_KB.map((k) => ({ ...k, user_id: user.id })))
      .select("id, question, answer, updated_at");
    if (!seedError && inserted) {
      data = inserted;
      seeded = true;
    }
  }
  return NextResponse.json({ ok: true, items: data ?? [], seeded });
}

export async function POST(request: Request) {
  const auth = await authed();
  if ("error" in auth) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  const { supabase, user } = auth;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
  const { question, answer } = body as { question?: unknown; answer?: unknown };
  if (typeof question !== "string" || question.trim() === "") {
    return NextResponse.json({ ok: false, error: "question is required." }, { status: 400 });
  }
  if (typeof answer !== "string" || answer.trim() === "") {
    return NextResponse.json({ ok: false, error: "answer is required." }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("knowledge_items")
    .insert({ user_id: user.id, question: question.trim(), answer: answer.trim() })
    .select("id, question, answer, updated_at")
    .single();
  if (error || !data) {
    return NextResponse.json({ ok: false, error: "kb_create_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, item: data }, { status: 201 });
}

export async function PUT(request: Request) {
  const auth = await authed();
  if ("error" in auth) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  const { supabase, user } = auth;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
  const { id, question, answer } = body as {
    id?: unknown;
    question?: unknown;
    answer?: unknown;
  };
  if (typeof id !== "string" || id.trim() === "") {
    return NextResponse.json({ ok: false, error: "id is required." }, { status: 400 });
  }
  if (typeof question !== "string" || question.trim() === "") {
    return NextResponse.json({ ok: false, error: "question is required." }, { status: 400 });
  }
  if (typeof answer !== "string" || answer.trim() === "") {
    return NextResponse.json({ ok: false, error: "answer is required." }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("knowledge_items")
    .update({ question: question.trim(), answer: answer.trim() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, question, answer, updated_at")
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ ok: false, error: "kb_update_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, item: data });
}

export async function DELETE(request: Request) {
  const auth = await authed();
  if ("error" in auth) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  const { supabase, user } = auth;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
  const { id } = body as { id?: unknown };
  if (typeof id !== "string" || id.trim() === "") {
    return NextResponse.json({ ok: false, error: "id is required." }, { status: 400 });
  }
  const { error } = await supabase
    .from("knowledge_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ ok: false, error: "kb_delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, deleted: id });
}
