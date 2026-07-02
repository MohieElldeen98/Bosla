import { calculateProfileCompleteness } from "@/auth/utils/profile-completeness";
import type { Profile } from "@/auth/types/profile";

/**
 * Below this, a public page would look sparse/unfinished — this is a
 * quality gate, not a role gate: role-agnostic on purpose, since
 * "Future Ready" requires both Instructor *and* Student public pages to
 * be possible without a rewrite (docs/authentication-architecture.md).
 * Which template a role renders is a future page-routing decision, not an
 * eligibility one.
 */
const MIN_COMPLETENESS_FOR_PUBLIC_PROFILE = 60;

export function isEligibleForPublicProfile(profile: Profile): boolean {
  if (profile.status !== "active") return false;
  if (!profile.isPublic) return false;
  return calculateProfileCompleteness(profile).percentage >= MIN_COMPLETENESS_FOR_PUBLIC_PROFILE;
}
