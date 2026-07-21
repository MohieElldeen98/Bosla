"use server";

import { SessionService } from "@/auth/services/session.service";
import { ProfileService } from "@/auth/services/profile.service";
import type { Profile } from "@/auth/types/profile";
import type { ProfileActionResult } from "@/auth/types/profile-result";

/** `/me/profile` and `/me/settings`'s (language toggle) shared write path
 *  — always the caller's own profile, `ProfileService.updateProfile`
 *  already re-validates via `updateProfileSchema.partial()`, so a
 *  partial payload (e.g. just `{ language }`) is exactly as valid as
 *  the full profile form's payload. */
export async function updateOwnProfileAction(rawInput: unknown): Promise<ProfileActionResult<Profile>> {
  const user = await SessionService.getCurrentUser();
  if (!user) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  return ProfileService.updateProfile(user, user.id, rawInput);
}
