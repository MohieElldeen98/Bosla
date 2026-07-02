import type { Profile, ProfileCompleteness } from "@/auth/types/profile";

/**
 * One entry per field the brief lists for completeness scoring — equal
 * weight each. Adding a field later (e.g. once certificates exist) is one
 * more tuple entry, not a rewrite of the scoring logic itself.
 */
const COMPLETENESS_CHECKS: ReadonlyArray<{ field: string; isFilled: (profile: Profile) => boolean }> = [
  { field: "avatarUrl", isFilled: (p) => Boolean(p.avatarUrl) },
  { field: "profession", isFilled: (p) => Boolean(p.profession) },
  { field: "bio", isFilled: (p) => Boolean(p.bio && p.bio.trim().length > 0) },
  { field: "country", isFilled: (p) => Boolean(p.country) },
  { field: "language", isFilled: (p) => Boolean(p.language) },
  { field: "specialties", isFilled: (p) => p.specialties.length > 0 },
  { field: "yearsOfExperience", isFilled: (p) => p.yearsOfExperience != null },
  { field: "displayName", isFilled: (p) => Boolean(p.displayName) },
];

export function calculateProfileCompleteness(profile: Profile): ProfileCompleteness {
  const missingFields = COMPLETENESS_CHECKS.filter((check) => !check.isFilled(profile)).map(
    (check) => check.field,
  );
  const filledCount = COMPLETENESS_CHECKS.length - missingFields.length;
  const percentage = Math.round((filledCount / COMPLETENESS_CHECKS.length) * 100);

  return { percentage, missingFields };
}
