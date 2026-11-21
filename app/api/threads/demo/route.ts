// CrewDesk — DELETE /api/threads/demo
// Deletes the signed-in user's demo threads (is_demo=true) from the DB.
// The Dashboard "Demo" tab shows lib/crew/demo-data.ts, which is static
// sample data and cannot be deleted — this endpoint only removes demo
// threads the user actually created in their own DB.

import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { requireUser } from "@/lib/crew/db";

export async function DELETE() {
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
  const { error, count } = await supabase
    .from("threads")
    .delete({ count: "exact" })
    .eq("user_id", user.id)
    .eq("is_demo", true);
  if (error) {
    return NextResponse.json({ ok: false, error: "demo_delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, deleted: count ?? 0 });
}
