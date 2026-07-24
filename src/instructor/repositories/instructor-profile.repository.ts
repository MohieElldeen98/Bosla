import { and, asc, desc, eq, exists, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { timestampMatches } from "@/db/optimistic-concurrency";
import { instructorProfiles } from "@/db/schema/instructor";
import { profiles } from "@/db/schema/profiles";
import {
  DEFAULT_INSTRUCTOR_PROFILE_PAGE_SIZE,
  DEFAULT_INSTRUCTOR_PROFILE_SORT_DIRECTION,
  DEFAULT_INSTRUCTOR_PROFILE_SORT_FIELD,
  type InstructorProfileSearchFilters,
  type InstructorProfileSearchResult,
} from "@/instructor/types/instructor-profile-search";
import type {
  InstructorApplicationStatus,
  InstructorProfile,
  NewInstructorProfileInput,
} from "@/instructor/types/instructor-profile";
import type { OptimisticUpdateResult } from "@/instructor/types/repository-result";

type InstructorProfileRow = typeof instructorProfiles.$inferSelect;

export interface UpdateInstructorProfileStatusRow {
  status: InstructorApplicationStatus;
  approvedAt?: Date | null;
  approvedByUserId?: string | null;
}

const SORT_COLUMNS = {
  createdAt: instructorProfiles.createdAt,
  updatedAt: instructorProfiles.updatedAt,
} as const;

function mapRowToInstructorProfile(row: InstructorProfileRow): InstructorProfile {
  return {
    id: row.id,
    userId: row.userId,
    headline: row.headline as InstructorProfile["headline"],
    credentials: row.credentials,
    status: row.status,
    approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
    approvedByUserId: row.approvedByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Data access for `instructor_profiles`. `InstructorApplicationService`
 *  is the only caller. */
export const InstructorProfileRepository = {
  async create(input: NewInstructorProfileInput): Promise<InstructorProfile> {
    const [row] = await getDb()
      .insert(instructorProfiles)
      .values({
        userId: input.userId,
        headline: input.headline,
        credentials: input.credentials ?? null,
        updatedAt: new Date(),
      })
      .returning();
    return mapRowToInstructorProfile(row);
  },

  async findById(id: string): Promise<InstructorProfile | null> {
    const [row] = await getDb().select().from(instructorProfiles).where(eq(instructorProfiles.id, id)).limit(1);
    return row ? mapRowToInstructorProfile(row) : null;
  },

  async findByUserId(userId: string): Promise<InstructorProfile | null> {
    const [row] = await getDb()
      .select()
      .from(instructorProfiles)
      .where(eq(instructorProfiles.userId, userId))
      .limit(1);
    return row ? mapRowToInstructorProfile(row) : null;
  },

  /** `query` matches the applicant's name/email via an `EXISTS`
   *  subquery against `profiles` — no cross-domain SQL join, same
   *  pattern `EnrollmentRepository.search`'s own `query` filter
   *  established. */
  async search(filters: InstructorProfileSearchFilters): Promise<InstructorProfileSearchResult<InstructorProfile>> {
    const conditions: SQL[] = [];

    if (filters.query) {
      const pattern = `%${filters.query}%`;
      conditions.push(
        exists(
          getDb()
            .select({ one: sql`1` })
            .from(profiles)
            .where(
              and(
                eq(profiles.userId, instructorProfiles.userId),
                or(
                  ilike(profiles.fullName, pattern),
                  ilike(profiles.displayName, pattern),
                  ilike(profiles.email, pattern),
                ),
              ),
            ),
        ) as SQL,
      );
    }
    if (filters.status) conditions.push(eq(instructorProfiles.status, filters.status));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const sortColumn = SORT_COLUMNS[filters.sortBy ?? DEFAULT_INSTRUCTOR_PROFILE_SORT_FIELD];
    const orderFn = (filters.sortDirection ?? DEFAULT_INSTRUCTOR_PROFILE_SORT_DIRECTION) === "asc" ? asc : desc;
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = filters.pageSize ?? DEFAULT_INSTRUCTOR_PROFILE_PAGE_SIZE;

    const [rows, countRows] = await Promise.all([
      getDb()
        .select()
        .from(instructorProfiles)
        .where(whereClause)
        .orderBy(orderFn(sortColumn))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      getDb().select({ count: sql<number>`count(*)::int` }).from(instructorProfiles).where(whereClause),
    ]);
    const total = countRows[0]?.count ?? 0;

    return {
      items: rows.map(mapRowToInstructorProfile),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  async updateStatus(
    id: string,
    input: UpdateInstructorProfileStatusRow,
    expectedUpdatedAt?: string,
  ): Promise<OptimisticUpdateResult<InstructorProfile>> {
    const conditions = [eq(instructorProfiles.id, id)];
    if (expectedUpdatedAt) conditions.push(timestampMatches(instructorProfiles.updatedAt, expectedUpdatedAt));

    const [row] = await getDb()
      .update(instructorProfiles)
      .set({ ...input, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();

    if (row) return { status: "ok", data: mapRowToInstructorProfile(row) };
    if (!expectedUpdatedAt) return { status: "not_found" };

    const stillExists = await InstructorProfileRepository.findById(id);
    return stillExists ? { status: "conflict" } : { status: "not_found" };
  },
};
