/**
 * Mirrors the `profile_status` Postgres enum exactly
 * (`db/schema/profiles.ts`) — the two must change together. See
 * docs/authentication-architecture.md "Profile lifecycle" for the state
 * transitions.
 */
export const PROFILE_STATUSES = [
  "pending",
  "active",
  "suspended",
  "archived",
  "deleted",
] as const;

export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

export const DEFAULT_PROFILE_STATUS: ProfileStatus = "pending";

export function isProfileStatus(value: unknown): value is ProfileStatus {
  return typeof value === "string" && (PROFILE_STATUSES as readonly string[]).includes(value);
}
