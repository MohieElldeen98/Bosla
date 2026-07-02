import { redirect } from "@/i18n/navigation";
import { SessionService } from "@/auth/services/session.service";
import { SIGN_IN_PATH } from "@/auth/constants/routes";
import type { Locale } from "@/i18n/routing";
import type { AuthUser } from "@/auth/types/session";

/**
 * Guarantees an authenticated user for a Server Component layout, or
 * redirects to sign-in before any protected data is fetched — "route
 * groups enforce access, not conditional UI" (docs/architecture.md §7).
 */
export async function requireAuth(locale: Locale): Promise<AuthUser> {
  const user = await SessionService.getCurrentUser();
  if (!user) {
    return redirect({ href: SIGN_IN_PATH, locale });
  }
  return user;
}
