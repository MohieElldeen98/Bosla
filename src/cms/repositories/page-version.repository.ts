import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { cmsAuditLogs, cmsPages, cmsPageVersions, cmsSeoMeta, cmsSections } from "@/db/schema/cms";
import type {
  CmsPageVersion,
  CmsPageVersionSnapshot,
  NewCmsPageVersionInput,
} from "@/cms/types/page-version";

/** True when `error` is a Postgres unique-constraint violation (SQLSTATE
 *  `23505`) — the signal that two publishes raced past the service-level
 *  `expectedPublishedVersion` pre-check and both tried to insert the same
 *  `(page_id, version)` (docs/cms-overview.md §16). */
export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

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

  /** Inserts the new version row, stamps `cms_pages.published_at`, and
   *  writes the `publish` audit-log entry, all in one transaction — either
   *  all three happen, or none do ("never partially publish",
   *  docs/cms-overview.md §16). The `(page_id, version)` unique index is
   *  the last-resort guard against two simultaneous publishes; the
   *  service-level `expectedPublishedVersion` check is what makes that
   *  actually reachable-and-rare rather than the normal case — see
   *  `isUniqueViolation`. */
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

      await tx.insert(cmsAuditLogs).values({
        action: "publish",
        pageId: input.pageId,
        actorId: input.publishedBy,
        metadata: { version: input.version },
      });

      return mapRowToVersion(row);
    });
  },

  /** Overwrites the draft `cms_sections`/`cms_seo_meta` rows to match a
   *  snapshot's content and writes the `revert` audit-log entry, all in one
   *  transaction. A snapshot section/SEO id that no longer exists in the
   *  draft tables (only possible if a row were deleted outside the current
   *  admin UI, which has no delete action yet) is silently skipped rather
   *  than aborting the whole revert — fail gracefully, not a
   *  partial-failure the admin can't recover from. */
  async restoreDraftFromSnapshot(
    snapshot: CmsPageVersionSnapshot,
    revertedToVersion: number,
    actorId: string | null,
  ): Promise<void> {
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

      await tx.insert(cmsAuditLogs).values({
        action: "revert",
        pageId: snapshot.page.id,
        actorId,
        metadata: { revertedToVersion },
      });
    });
  },
};
