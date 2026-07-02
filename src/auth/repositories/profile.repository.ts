import { and, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { profiles } from "@/db/schema/profiles";
import { DEFAULT_ROLE, type Role } from "@/auth/types/role";
import { DEFAULT_PROFILE_STATUS, type ProfileStatus } from "@/auth/types/profile-status";
import type { NewProfileInput, Profile, ProfileSearchFilters } from "@/auth/types/profile";

type ProfileRow = typeof profiles.$inferSelect;

/**
 * Every column `update()` is willing to set — deliberately broader than
 * the user-facing `UpdateProfileInput` (Zod, `auth/validators/profile.
 * validator.ts`): the repository is honest data access, not the place
 * that decides *who* may set *which* field. `ProfileService` is where
 * that distinction lives — user edits go through `updateProfileSchema`
 * first (a strict subset of this type); system transitions
 * (`activateProfile`, `recordLogin`) set `status`/`lastLoginAt` directly,
 * fields no Zod-validated user input ever reaches.
 */
export interface ProfileMutableFields {
  fullName?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  profession?: string | null;
  country?: string | null;
  language?: string;
  bio?: string | null;
  website?: string | null;
  linkedin?: string | null;
  yearsOfExperience?: number | null;
  specialties?: string[];
  isPublic?: boolean;
  role?: Role;
  status?: ProfileStatus;
  lastLoginAt?: Date | null;
}

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function mapRowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    userId: row.userId,
    email: row.email,
    fullName: row.fullName,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    profession: row.profession,
    country: row.country,
    language: row.language,
    bio: row.bio,
    website: row.website,
    linkedin: row.linkedin,
    yearsOfExperience: row.yearsOfExperience,
    specialties: row.specialties,
    role: row.role,
    status: row.status,
    isPublic: row.isPublic,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastLoginAt: toIso(row.lastLoginAt),
    deletedAt: toIso(row.deletedAt),
  };
}

/**
 * Data access for `profiles` — every method name matches
 * docs/authentication-architecture.md's Profile Repository contract
 * exactly. `ProfileService` is the only caller; nothing else queries this
 * table directly (see that file for validation/authorization/business
 * rules, none of which belong here).
 */
export const ProfileRepository = {
  /**
   * Idempotent by design, not just by accident: `ON CONFLICT (user_id)`
   * can legitimately fire two ways — the `handle_new_user()` DB trigger
   * (drizzle/0001_*.sql) racing the app-level bootstrap call, or a retried
   * request. Either way, `COALESCE(existing, incoming)` backfills only the
   * columns that are still empty, so whichever path has richer data (the
   * trigger only has `auth.users.raw_user_meta_data`; the app call has the
   * full sign-up form) wins for each field, and neither can ever produce a
   * duplicate row or silently clobber good data with null. Role/status are
   * deliberately never touched here — bootstrap is not how a role changes.
   */
  async create(input: NewProfileInput): Promise<Profile> {
    const [row] = await getDb()
      .insert(profiles)
      .values({
        userId: input.userId,
        email: input.email,
        fullName: input.fullName ?? null,
        displayName: input.displayName ?? input.fullName ?? null,
        profession: input.profession ?? null,
        country: input.country ?? null,
        language: input.language ?? "en",
        role: DEFAULT_ROLE,
        status: DEFAULT_PROFILE_STATUS,
      })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: {
          fullName: sql`coalesce(${profiles.fullName}, excluded.full_name)`,
          displayName: sql`coalesce(${profiles.displayName}, excluded.display_name)`,
          profession: sql`coalesce(${profiles.profession}, excluded.profession)`,
          country: sql`coalesce(${profiles.country}, excluded.country)`,
        },
      })
      .returning();

    return mapRowToProfile(row);
  },

  async findByUserId(
    userId: string,
    options: { includeDeleted?: boolean } = {},
  ): Promise<Profile | null> {
    const conditions = [eq(profiles.userId, userId)];
    if (!options.includeDeleted) {
      conditions.push(isNull(profiles.deletedAt));
    }

    const [row] = await getDb()
      .select()
      .from(profiles)
      .where(and(...conditions))
      .limit(1);

    return row ? mapRowToProfile(row) : null;
  },

  async exists(userId: string): Promise<boolean> {
    const [row] = await getDb()
      .select({ id: profiles.id })
      .from(profiles)
      .where(and(eq(profiles.userId, userId), isNull(profiles.deletedAt)))
      .limit(1);

    return Boolean(row);
  },

  async update(userId: string, input: ProfileMutableFields): Promise<Profile | null> {
    const [row] = await getDb()
      .update(profiles)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(profiles.userId, userId))
      .returning();

    return row ? mapRowToProfile(row) : null;
  },

  /** Soft delete — never removes the row. `deletedAt` is the source of
   *  truth `findByUserId`/`search` filter on; `status: "deleted"` is the
   *  human-readable mirror of the same fact. */
  async delete(userId: string): Promise<void> {
    await getDb()
      .update(profiles)
      .set({ status: "deleted", deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(profiles.userId, userId));
  },

  async restore(userId: string): Promise<Profile | null> {
    const [row] = await getDb()
      .update(profiles)
      .set({ status: "active", deletedAt: null, updatedAt: new Date() })
      .where(eq(profiles.userId, userId))
      .returning();

    return row ? mapRowToProfile(row) : null;
  },

  /**
   * Composable by construction — each filter is one optional `and()`
   * clause, so a new search dimension later is additive, never a rewrite
   * (docs/authentication-architecture.md "Search").
   */
  async search(filters: ProfileSearchFilters): Promise<Profile[]> {
    const conditions: SQL[] = [isNull(profiles.deletedAt)];

    if (filters.query) {
      const nameMatch = or(
        ilike(profiles.fullName, `%${filters.query}%`),
        ilike(profiles.displayName, `%${filters.query}%`),
      );
      if (nameMatch) conditions.push(nameMatch);
    }
    if (filters.profession) conditions.push(eq(profiles.profession, filters.profession));
    if (filters.country) conditions.push(eq(profiles.country, filters.country));
    if (filters.role) conditions.push(eq(profiles.role, filters.role));
    if (filters.status) conditions.push(eq(profiles.status, filters.status));

    const rows = await getDb()
      .select()
      .from(profiles)
      .where(and(...conditions))
      .limit(filters.limit ?? 20)
      .offset(filters.offset ?? 0);

    return rows.map(mapRowToProfile);
  },
};
