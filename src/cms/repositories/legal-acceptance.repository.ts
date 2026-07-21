import { and, desc, eq, exists, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { legalDocumentAcceptances } from "@/db/schema/legal";
import { profiles } from "@/db/schema/profiles";
import {
  DEFAULT_LEGAL_ACCEPTANCE_PAGE_SIZE,
  type LegalDocumentVersionAcceptorFilters,
} from "@/cms/types/legal-acceptance";

export type LegalDocumentAcceptance = typeof legalDocumentAcceptances.$inferSelect;

/** One raw acceptance row scoped to a version, pre-profile-resolution —
 *  `LegalAcceptanceService` resolves `userId` to a display name/email
 *  via `ProfileService.getByUserIds`, the same "no cross-domain SQL
 *  join, compose in the service" convention every other domain in this
 *  repo follows (see `OrderService.resolveOrders`). */
export type LegalDocumentVersionAcceptorRow = {
  userId: string;
  acceptedAt: string;
};

export type LegalDocumentVersionAcceptorSearchResult = {
  items: LegalDocumentVersionAcceptorRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type LegalDocumentVersionAcceptanceCounts = {
  count: number;
  firstAcceptedAt: string | null;
  lastAcceptedAt: string | null;
};

export const LegalAcceptanceRepository = {
  async findByUserAndSlugs(userId: string, slugs: readonly string[]): Promise<LegalDocumentAcceptance[]> {
    return getDb()
      .select()
      .from(legalDocumentAcceptances)
      .where(and(eq(legalDocumentAcceptances.userId, userId), inArray(legalDocumentAcceptances.slug, [...slugs])));
  },

  async upsert(
    userId: string,
    slug: string,
    acceptedVersion: number,
    acceptedDocumentVersionId: string | null,
  ): Promise<void> {
    const acceptedAt = new Date();
    await getDb()
      .insert(legalDocumentAcceptances)
      .values({ userId, slug, acceptedVersion, acceptedDocumentVersionId, acceptedAt })
      .onConflictDoUpdate({
        target: [legalDocumentAcceptances.userId, legalDocumentAcceptances.slug],
        set: { acceptedVersion, acceptedDocumentVersionId, acceptedAt },
      });
  },

  /** The version history page's "Accepted by" summary — one aggregate
   *  query, not a fetch-everything-and-reduce-in-JS. */
  async countByVersionId(versionId: string): Promise<LegalDocumentVersionAcceptanceCounts> {
    const [row] = await getDb()
      .select({
        count: sql<number>`count(*)::int`,
        firstAcceptedAt: sql<Date | null>`min(${legalDocumentAcceptances.acceptedAt})`,
        lastAcceptedAt: sql<Date | null>`max(${legalDocumentAcceptances.acceptedAt})`,
      })
      .from(legalDocumentAcceptances)
      .where(eq(legalDocumentAcceptances.acceptedDocumentVersionId, versionId));
    return {
      count: row?.count ?? 0,
      firstAcceptedAt: row?.firstAcceptedAt ? new Date(row.firstAcceptedAt).toISOString() : null,
      lastAcceptedAt: row?.lastAcceptedAt ? new Date(row.lastAcceptedAt).toISOString() : null,
    };
  },

  /** "Users who accepted this version" — paginated, `query` matching
   *  name/email via an `EXISTS` subquery against `profiles` (no
   *  cross-domain SQL join), the exact pattern
   *  `OrderRepository.search`'s own free-text filter already
   *  established in this codebase. */
  async searchByVersionId(
    versionId: string,
    filters: LegalDocumentVersionAcceptorFilters,
  ): Promise<LegalDocumentVersionAcceptorSearchResult> {
    const conditions: SQL[] = [eq(legalDocumentAcceptances.acceptedDocumentVersionId, versionId)];
    if (filters.query) {
      const pattern = `%${filters.query}%`;
      conditions.push(
        exists(
          getDb()
            .select({ one: sql`1` })
            .from(profiles)
            .where(
              and(
                eq(profiles.userId, legalDocumentAcceptances.userId),
                or(ilike(profiles.fullName, pattern), ilike(profiles.displayName, pattern), ilike(profiles.email, pattern)),
              ),
            ),
        ) as SQL,
      );
    }

    const whereClause = and(...conditions);
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = filters.pageSize ?? DEFAULT_LEGAL_ACCEPTANCE_PAGE_SIZE;

    const [rows, countRows] = await Promise.all([
      getDb()
        .select({ userId: legalDocumentAcceptances.userId, acceptedAt: legalDocumentAcceptances.acceptedAt })
        .from(legalDocumentAcceptances)
        .where(whereClause)
        .orderBy(desc(legalDocumentAcceptances.acceptedAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      getDb().select({ count: sql<number>`count(*)::int` }).from(legalDocumentAcceptances).where(whereClause),
    ]);
    const total = countRows[0]?.count ?? 0;

    return {
      items: rows.map((row) => ({ userId: row.userId, acceptedAt: row.acceptedAt.toISOString() })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },
};
