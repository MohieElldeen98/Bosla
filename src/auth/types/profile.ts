import type { Role } from "@/auth/types/role";
import type { ProfileStatus } from "@/auth/types/profile-status";

/**
 * Application-owned business data for a user (`db/schema/profiles.ts`) —
 * deliberately separate from Supabase Auth's `auth.users` (identity/
 * credentials, owned by Supabase). One row per Supabase Auth user. See
 * docs/authentication-architecture.md "Profile lifecycle".
 *
 * Dates are ISO strings (not `Date`), matching every other domain type in
 * `auth/types/*` — `ProfileRepository` converts Drizzle's `Date` columns
 * at the boundary so nothing above the repository ever sees a raw DB type.
 */
export interface Profile {
  id: string;
  userId: string;
  email: string;
  fullName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  profession: string | null;
  country: string | null;
  language: string;
  bio: string | null;
  website: string | null;
  linkedin: string | null;
  yearsOfExperience: number | null;
  specialties: string[];
  role: Role;
  status: ProfileStatus;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  deletedAt: string | null;
}

/**
 * Input for `ProfileRepository.create` / `ProfileService.bootstrapProfile`.
 * Deliberately narrow — role/status default server-side
 * (`DEFAULT_ROLE`/`DEFAULT_PROFILE_STATUS`) rather than being caller-
 * supplied, since bootstrap is not the path for promoting a role or
 * changing status (that's a future admin action, see
 * `auth/utils/can-modify-profile.ts`).
 */
export interface NewProfileInput {
  userId: string;
  email: string;
  fullName?: string | null;
  displayName?: string | null;
  profession?: string | null;
  country?: string | null;
  language?: string;
}

/** `ProfileRepository.search` / `ProfileService.search` filters — every
 *  field is optional and additive, so a new filter dimension later is one
 *  more optional property, not a rewrite (see
 *  docs/authentication-architecture.md "Search"). */
export interface ProfileSearchFilters {
  query?: string;
  profession?: string;
  country?: string;
  role?: Role;
  status?: ProfileStatus;
  limit?: number;
  offset?: number;
}

export interface ProfileCompleteness {
  percentage: number;
  missingFields: string[];
}
