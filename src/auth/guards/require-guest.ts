import { redirect } from "@/i18n/navigation";
import { SessionService } from "@/auth/services/session.service";
import { getDefaultRedirectPath } from "@/auth/utils/role.utils";
import type { Locale } from "@/i18n/routing";

/**
 * Guards the (auth) route group's guest-only pages (sign-in, sign-up,
 * forgot/reset password) — an already-authenticated user is redirected to
 * their role's default surface instead of seeing the auth forms again.
 */
export async function requireGuest(locale: Locale): Promise<void> {
  const user = await SessionService.getCurrentUser();
  if (user) {
    redirect({ href: getDefaultRedirectPath(user.role), locale });
  }
}
