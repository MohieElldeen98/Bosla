import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { cmsPages, cmsPageVersions, cmsSeoMeta, cmsSections } from "@/db/schema/cms";
import type {
  CmsPageVersion,
  CmsPageVersionSnapshot,
  NewCmsPageVersionInput,
} from "@/cms/types/page-version";

type CmsPageVersionRow = typeof cmsPageVersions.$inferSelect;

function mapRowToVersion(row: CmsPageVersionRow): CmsPageVersion {
  return {
    id: row.id,
    pageId: row.pageId,
    version: row.version,
    snapshot: row.snapshot as CmsPageVersionSnapshot,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    publishedAt: row.publishedAt.toISOString(),
    publishedBy: row.publishedBy,
  };
}

/**
 * Data access for `cms_page_versions` — an append-only log, so reads never
 * update or delete a row. `CmsPageVersionService` is the only caller.
 *
 * Two methods here (`createAndMarkPublished`, `restoreDraftFromSnapshot`)
 * each span a second table (`cms_pages`, or `cms_sections`/`cms_seo_meta`)
 * inside one `getDb().transaction(...)` — the same "repository owns the
 * transaction it needs for atomicity" precedent
 * `CmsSectionRepository.reorder` already established, just crossing a
 * table boundary here since publish/revert are inherently cross-table
 * operations (a version row plus the pointer/draft it affects).
 */
export const CmsPageVersionRepository = {
  /** The current published version — this table has no separate "draft
   *  snapshot" concept yet (docs/cms-overview.md §15), so the highest
   *  `version` row for a page is always its currently-live published
   *  state. */
  async findLatestByPageId(pageId: string): Promise<CmsPageVersion | null> {
    const [row] = await getDb()
      .select()
      .from(cmsPageVersions)
      .where(eq(cmsPageVersions.pageId, pageId))
      .orderBy(desc(cmsPageVersions.version))
      .limit(1);
    return row ? mapRowToVersion(row) : null;
  },

  /** Inserts the new version row and stamps `cms_pages.published_at` in
   *  one transaction — either both happen, or neither does. */
  async createAndMarkPublished(input: NewCmsPageVersionInput): Promise<CmsPageVersion> {
    return getDb().transaction(async (tx) => {
      const [row] = await tx
        .insert(cmsPageVersions)
        .values({
          pageId: input.pageId,
          version: input.version,
          snapshot: input.snapshot,
          createdBy: input.createdBy,
          publishedBy: input.publishedBy,
        })
        .returning();

      await tx
        .update(cmsPages)
        .set({ publishedAt: row.publishedAt, updatedAt: new Date() })
        .where(eq(cmsPages.id, input.pageId));

      return mapRowToVersion(row);
    });
  },

  /** Overwrites the draft `cms_sections`/`cms_seo_meta` rows to match a
   *  snapshot's content — the write side of "revert to last published."
   *  A snapshot section/SEO id that no longer exists in the draft tables
   *  (only possible if a row were deleted outside the current admin UI,
   *  which has no delete action yet) is silently skipped rather than
   *  aborting the whole revert — fail gracefully, not a partial-failure
   *  the admin can't recover from. */
  async restoreDraftFromSnapshot(snapshot: CmsPageVersionSnapshot): Promise<void> {
    await getDb().transaction(async (tx) => {
      for (const section of snapshot.sections) {
        await tx
          .update(cmsSections)
          .set({
            content: section.content,
            isEnabled: section.isEnabled,
            position: section.position,
            updatedAt: new Date(),
          })
          .where(eq(cmsSections.id, section.id));
      }

      if (snapshot.seo) {
        await tx
          .update(cmsSeoMeta)
          .set({
            title: snapshot.seo.title,
            description: snapshot.seo.description,
            ogImageId: snapshot.seo.ogImageId,
            canonicalPath: snapshot.seo.canonicalPath,
            updatedAt: new Date(),
          })
          .where(eq(cmsSeoMeta.id, snapshot.seo.id));
      }
    });
  },
};
