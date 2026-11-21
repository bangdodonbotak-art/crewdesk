// CrewDesk — GET /api/threads/[id] + DELETE /api/threads/demo
// GET: one live thread with its audit-log steps + approvals. Auth required.
// DELETE /api/threads/demo is handled by the `demo` route file instead;
// this file only serves GET [id].

import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { requireUser } from "@/lib/crew/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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

  const { data: thread, error } = await supabase
    .from("threads")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !thread) {
    return NextResponse.json({ ok: false, error: "thread_not_found" }, { status: 404 });
  }
  const { data: steps } = await supabase
    .from("steps")
    .select("id, step, detail, actor, status, created_at")
    .eq("thread_id", id)
    .order("created_at", { ascending: true });
  const { data: approvals } = await supabase
    .from("approvals")
    .select("id, action, edited_draft, created_at")
    .eq("thread_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    ok: true,
    thread,
    steps: steps ?? [],
    approvals: approvals ?? [],
  });
}
