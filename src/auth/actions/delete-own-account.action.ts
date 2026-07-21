"use server";

import { SessionService } from "@/auth/services/session.service";
import { ProfileService } from "@/auth/services/profile.service";
import type { ProfileActionResult } from "@/auth/types/profile-result";

/** `/me/settings`'s "Delete account" — `ProfileService.softDeleteProfile`
 *  already allows self-deletion (`canModifyProfile`), this is just the
 *  thin self-scoped Server Action wrapper every other "own" action here
 *  already follows. Deliberately does NOT sign the user out itself —
 *  the caller does that the same two-step way `NavbarUserMenu`'s sign-
 *  out already does (`signOutAction()` + the client-side
 *  `SessionClientService.signOut()`, so `useSession()`'s listener fires),
 *  right after this resolves successfully. */
export async function deleteOwnAccountAction(): Promise<ProfileActionResult> {
  const user = await SessionService.getCurrentUser();
  if (!user) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  return ProfileService.softDeleteProfile(user, user.id);
}
