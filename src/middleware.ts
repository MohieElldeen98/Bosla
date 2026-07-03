import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { stripLocalePrefix } from "./i18n/strip-locale-prefix";
import { resolveMiddlewareUser } from "./middleware/session";
import { evaluateRouteAccess } from "./middleware/route-protection";

const handleIntl = createIntlMiddleware(routing);

/**
 * Composed in three steps — see docs/authentication-architecture.md §3:
 * (1) next-intl resolves/rewrites the locale, (2) the Supabase session is
 * refreshed against that response so its Set-Cookie header is preserved,
 * (3) route-protection decides whether to allow the now-locale-resolved
 * request or redirect (guest-only / protected route rules, mirroring
 * docs/roles-and-permissions.md §3).
 */
export default async function middleware(request: NextRequest) {
  const intlResponse = handleIntl(request);
  const user = await resolveMiddlewareUser(request, intlResponse);

  const localeAgnosticPath = stripLocalePrefix(request.nextUrl.pathname);
  const fullPath = request.nextUrl.pathname + request.nextUrl.search;
  const decision = evaluateRouteAccess({ localeAgnosticPath, fullPath, user });

  if (decision.type === "redirect") {
    const locale =
      routing.locales.find((loc) => request.nextUrl.pathname.startsWith(`/${loc}`)) ??
      routing.defaultLocale;
    const redirectUrl = new URL(`/${locale}${decision.path}`, request.url);
    if (decision.returnTo) {
      redirectUrl.searchParams.set("redirectTo", decision.returnTo);
    }

    const redirectResponse = NextResponse.redirect(redirectUrl);
    intlResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  return intlResponse;
}

export const config = {
  // `auth/confirm` is deliberately outside `[locale]` (see
  // `src/app/auth/confirm/route.ts`'s doc comment) — Supabase email links
  // and the Google OAuth redirect need one stable, non-locale-prefixed
  // callback URL. Excluded here too, otherwise next-intl redirects it to
  // `/<locale>/auth/confirm`, which 404s (no such route exists).
  matcher: ["/((?!api|trpc|_next|_vercel|auth/confirm|.*\\..*).*)"],
};
