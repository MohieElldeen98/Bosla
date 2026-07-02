"use server";

import { SessionService } from "@/auth/services/session.service";
import { ProfileService } from "@/auth/services/profile.service";
import type { GetMyProfileAction } from "@/auth/actions/action-contracts";

/**
 * Backs the public navbar's user menu (`navbar.tsx`), which reads auth
 * state client-side via `useSession()` to keep the ISR-cached homepage
 * static (a server-side `SessionService` call in `page.tsx` would force
 * the whole route dynamic — see docs/architecture.md's "Static/SSG + ISR"
 * commitment for the marketing site). This fills the one gap `AuthUser`
 * doesn't cover — display name — via the same `ProfileService` every other
 * profile read already goes through.
 */
export const getMyProfileAction: GetMyProfileAction = async () => {
  const user = await SessionService.getCurrentUser();
  if (!user) return null;
  return ProfileService.getByUserId(user.id);
};
