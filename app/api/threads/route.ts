// CrewDesk — GET /api/threads
// The signed-in user's live threads + today's quota. Auth required.
// Demo threads are never mixed in here — they live in lib/crew/demo-data.ts
// and the Dashboard "Demo" tab.

import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getQuota, requireUser } from "@/lib/crew/db";

export async function GET() {
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

  const { data, error } = await supabase
    .from("threads")
    .select(
      "id, subject, from_address, category, priority, sentiment, status, is_demo, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    return NextResponse.json({ ok: false, error: "threads_read_failed" }, { status: 500 });
  }

  const quota = await getQuota(supabase, user.id);
  return NextResponse.json({ ok: true, threads: data ?? [], quota });
}
