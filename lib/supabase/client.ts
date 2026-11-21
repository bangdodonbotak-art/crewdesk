// CrewDesk — Supabase browser client (scaffolding).
// Returns null when env vars are not set — never throws at build time.
// Supabase project NOT created yet; this is wiring for phase 2.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient | null {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  browserClient = createClient(url, anonKey);
  return browserClient;
}
