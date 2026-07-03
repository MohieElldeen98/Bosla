import { z } from "zod";
import { routing } from "@/i18n/routing";
import { ROLES } from "@/auth/types/role";
import { PROFILE_STATUSES } from "@/auth/types/profile-status";
import { PROFILE_SORT_DIRECTIONS, PROFILE_SORT_FIELDS } from "@/auth/types/profile-search";

/**
 * The single source of truth for every user-editable profile field.
 * `updateProfileSchema` derives from this via `.partial()` — no field list
 * is ever duplicated between "what can be created" and "what can be
 * updated" (docs/authentication-architecture.md "Validation"). Deliberately
 * excludes `id`/`userId`/`email`/`role`/`status`/timestamps — none of those
 * are user-editable through this schema; role/status changes are a future
 * admin action gated by `auth/utils/can-modify-profile.ts`, not a profile
 * edit.
 */
export const profileEditableFieldsSchema = z.object({
  fullName: z.string().trim().min(1).max(120).nullable(),
  displayName: z.string().trim().min(1).max(60).nullable(),
  avatarUrl: z.string().url().nullable(),
  profession: z.string().nullable(),
  country: z.string().nullable(),
  language: z.enum([...routing.locales]),
  bio: z.string().trim().max(2000).nullable(),
  website: z.string().url().nullable(),
  linkedin: z.string().url().nullable(),
  yearsOfExperience: z.number().int().min(0).max(80).nullable(),
  specialties: z.array(z.string()),
  isPublic: z.boolean(),
});

export const updateProfileSchema = profileEditableFieldsSchema.partial();
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const searchProfilesSchema = z.object({
  query: z.string().trim().min(1).optional(),
  profession: z.string().optional(),
  country: z.string().optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(PROFILE_STATUSES).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});
export type SearchProfilesInput = z.infer<typeof searchProfilesSchema>;

/**
 * Parses the admin Users listing's URL search params (Phase 7) — mirrors
 * `courses/validators/course.validator.ts`'s `searchCoursesSchema`
 * exactly: every field optional and defensively coerced, a malformed or
 * missing param degrades to "no filter"/"use the default" rather than
 * throwing.
 */
export const searchProfilesAdminSchema = z.object({
  query: z.string().trim().min(1).optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(PROFILE_STATUSES).optional(),
  sortBy: z.enum(PROFILE_SORT_FIELDS).optional(),
  sortDirection: z.enum(PROFILE_SORT_DIRECTIONS).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
export type SearchProfilesAdminInput = z.infer<typeof searchProfilesAdminSchema>;
