// CrewDesk — Supabase server client (scaffolding).
// Returns null when env vars are not set — never throws at build time.
// Uses the anon key for MVP scaffolding; the service-role key must NEVER
// be bundled into client code. Supabase project NOT created yet.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseServer(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  return createClient(url, anonKey);
}
