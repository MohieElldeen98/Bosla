import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { timestampMatches } from "@/db/optimistic-concurrency";
import { cmsSections } from "@/db/schema/cms";
import type { CmsSectionType } from "@/cms/types/section";
import type { OptimisticUpdateResult } from "@/cms/types/repository-result";

type CmsSectionRow = typeof cmsSections.$inferSelect;

/**
 * The repository-level shape: `content` stays `unknown` here — narrowing it
 * to the type-specific interface (`HeroSectionContent`, etc.) is
 * `CmsSectionService`'s job, via the schema registry in
 * `section-content.schemas.ts`. The repository has no opinion on content
 * shape, only on storage.
 */
export interface CmsSectionRecord {
  id: string;
  pageId: string;
  sectionType: CmsSectionType;
  isEnabled: boolean;
  position: number;
  content: unknown;
  createdAt: string;
  updatedAt: string;
}

function mapRowToSection(row: CmsSectionRow): CmsSectionRecord {
  return {
    id: row.id,
    pageId: row.pageId,
    sectionType: row.sectionType,
    isEnabled: row.isEnabled,
    position: row.position,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export interface CreateSectionRow {
  pageId: string;
  sectionType: CmsSectionType;
  content: unknown;
  isEnabled: boolean;
  position: number;
}

export interface UpdateSectionRow {
  content?: unknown;
  isEnabled?: boolean;
  position?: number;
}

/** Data access for `cms_sections`. `CmsSectionService` is the only caller. */
export const CmsSectionRepository = {
  async create(input: CreateSectionRow): Promise<CmsSectionRecord> {
    const [row] = await getDb()
      .insert(cmsSections)
      .values({
        pageId: input.pageId,
        sectionType: input.sectionType,
        content: input.content,
        isEnabled: input.isEnabled,
        position: input.position,
      })
      .returning();
    return mapRowToSection(row);
  },

  async findById(id: string): Promise<CmsSectionRecord | null> {
    const [row] = await getDb().select().from(cmsSections).where(eq(cmsSections.id, id)).limit(1);
    return row ? mapRowToSection(row) : null;
  },

  /** Ordered by `position` ascending — the same order a renderer would use. */
  async findByPageId(pageId: string): Promise<CmsSectionRecord[]> {
    const rows = await getDb()
      .select()
      .from(cmsSections)
      .where(eq(cmsSections.pageId, pageId))
      .orderBy(asc(cmsSections.position));
    return rows.map(mapRowToSection);
  },

  /** `expectedUpdatedAt`, when given, is included in the `WHERE` clause so
   *  the update itself is the atomic check-and-write — no separate
   *  read-then-write race window. If the row exists but the timestamp
   *  didn't match (someone else updated it first), a follow-up existence
   *  check distinguishes that from "no such row" so the caller gets the
   *  right `CmsActionResult` code. `timestampMatches` (not a plain `eq`)
   *  since `create` never overrides the column's `now()` default — every
   *  section's `updated_at` carries real microsecond precision from row
   *  one, which a JS-`Date`-sourced baseline can't represent. */
  async update(
    id: string,
    input: UpdateSectionRow,
    expectedUpdatedAt?: string,
  ): Promise<OptimisticUpdateResult<CmsSectionRecord>> {
    const conditions = [eq(cmsSections.id, id)];
    if (expectedUpdatedAt) {
      conditions.push(timestampMatches(cmsSections.updatedAt, expectedUpdatedAt));
    }

    const [row] = await getDb()
      .update(cmsSections)
      .set({ ...input, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();

    if (row) return { status: "ok", data: mapRowToSection(row) };
    if (!expectedUpdatedAt) return { status: "not_found" };

    const stillExists = await CmsSectionRepository.findById(id);
    return stillExists ? { status: "conflict" } : { status: "not_found" };
  },

  async delete(id: string): Promise<void> {
    await getDb().delete(cmsSections).where(eq(cmsSections.id, id));
  },

  /** Applies a full new ordering for a page's sections in one transaction —
   *  either every position updates, or none do. */
  async reorder(pageId: string, orderedSectionIds: string[]): Promise<void> {
    await getDb().transaction(async (tx) => {
      for (const [index, sectionId] of orderedSectionIds.entries()) {
        await tx
          .update(cmsSections)
          .set({ position: index, updatedAt: new Date() })
          .where(and(eq(cmsSections.id, sectionId), eq(cmsSections.pageId, pageId)));
      }
    });
  },
};
