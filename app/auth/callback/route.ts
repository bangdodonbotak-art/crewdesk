import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Auth callback (OAuth code exchange).
 * No secrets are hardcoded here — the URL and anon key come from env.
 * If Supabase is not configured yet, the user is sent back to /login
 * with an error flag instead of failing.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!code || !supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(
      `${origin}/login?error=supabase_not_configured`,
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
