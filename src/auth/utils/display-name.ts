import type { Profile } from "@/auth/types/profile";
import type { AuthUser } from "@/auth/types/session";

/**
 * What a signed-in user is called in UI chrome (navbar, "Signed in as" —
 * docs/authentication-architecture.md) — `Profile.displayName`, falling
 * back to `Profile.fullName`, falling back to the auth-only `AuthUser`'s
 * email. `profile` is nullable since it's fetched separately from
 * `AuthUser` and can legitimately not exist yet (e.g. the DB trigger that
 * creates it hasn't run) or fail to load without blocking the page.
 */
export function resolveDisplayName(profile: Profile | null, user: AuthUser): string {
  return profile?.displayName || profile?.fullName || user.email || "";
}

/**
 * A 1-2 character initials placeholder for an avatar — no image upload
 * exists yet (Step 6.x scope), so this is the only avatar treatment. Two
 * words → first letter of each; one word (or an email address) → its
 * first two characters.
 */
export function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}
