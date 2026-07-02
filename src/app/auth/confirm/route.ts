import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { AuthService } from "@/auth/services/auth.service";
import { routing } from "@/i18n/routing";

function extractLocale(pathname: string): string {
  const segment = pathname.split("/")[1];
  return (routing.locales as readonly string[]).includes(segment)
    ? segment
    : routing.defaultLocale;
}

/**
 * The one small piece of required glue code this UI step needs beyond the
 * five pages: every Supabase auth email link (sign-up confirmation,
 * password recovery) and the Google OAuth redirect land here first, so the
 * one-time code/token gets exchanged for a real session cookie *before*
 * the browser reaches a Bosla page. `auth/actions/*` builds the
 * `?next=` target this redirects to once the exchange succeeds. Calls
 * `AuthService` (never Supabase directly) so this stays consistent with
 * every other entry point — "no duplicated logic."
 *
 * Deliberately outside `[locale]` — Supabase needs one stable callback URL,
 * not a locale-prefixed one; `next` (which is locale-prefixed) is what
 * actually routes the user back into the right locale afterward.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? `/${routing.defaultLocale}`;

  let result;
  if (code) {
    result = await AuthService.exchangeCodeForSession(code);
  } else if (tokenHash && type) {
    result = await AuthService.verifyOtp({ type, tokenHash });
  }

  if (result?.success) {
    return NextResponse.redirect(new URL(next, request.url));
  }

  const locale = extractLocale(next);
  return NextResponse.redirect(new URL(`/${locale}/sign-in?authError=expired_token`, request.url));
}
