import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Supabase Auth callback (OAuth code exchange, @supabase/ssr pattern).
 * The session is persisted via cookies set on the response — without
 * this, the login would not survive the redirect in the App Router.
 * Success → /dashboard; failure → /login?error=auth_failed.
 * No secrets are hardcoded here — URL + anon key come from env.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!code || !supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(
      `${origin}/login?error=supabase_not_configured`,
    );
  }

  const response = NextResponse.redirect(`${origin}${next}`);
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Ensure a profile row exists (the DB trigger normally creates it;
  // this is the belt-and-braces upsert for providers that skip it).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from("profiles")
      .upsert({ id: user.id, email: user.email ?? null }, { onConflict: "id" });
  }

  return response;
}
