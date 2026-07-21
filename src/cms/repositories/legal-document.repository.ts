import { asc, eq } from "drizzle-orm";
import { getDb, type DbClient } from "@/db";
import { legalDocuments } from "@/db/schema/legal";
import type { LegalDocument, UpdateLegalDocumentInput } from "@/cms/types/legal-document";

type LegalDocumentRow = typeof legalDocuments.$inferSelect;

function mapRowToDocument(row: LegalDocumentRow): LegalDocument {
  return {
    id: row.id,
    slug: row.slug,
    titleEn: row.titleEn,
    titleAr: row.titleAr,
    contentEn: row.contentEn,
    contentAr: row.contentAr,
    version: row.version,
    published: row.published,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    updatedByUserId: row.updatedByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Data access for `legal_documents`. `LegalDocumentService` is the only
 *  caller. */
export const LegalDocumentRepository = {
  async findBySlug(slug: string): Promise<LegalDocument | null> {
    const [row] = await getDb().select().from(legalDocuments).where(eq(legalDocuments.slug, slug)).limit(1);
    return row ? mapRowToDocument(row) : null;
  },

  async findById(id: string, db: DbClient = getDb()): Promise<LegalDocument | null> {
    const [row] = await db.select().from(legalDocuments).where(eq(legalDocuments.id, id)).limit(1);
    return row ? mapRowToDocument(row) : null;
  },

  /** `/admin/content`'s listing — every document, alphabetical by slug
   *  (a fixed, small set; no pagination/sort UI needed). */
  async findAll(): Promise<LegalDocument[]> {
    const rows = await getDb().select().from(legalDocuments).orderBy(asc(legalDocuments.slug));
    return rows.map(mapRowToDocument);
  },

  /** Saves a draft — content changes without touching `published`/
   *  `publishedAt`/`version`. Publishing is `publish` below, a
   *  deliberately separate step. */
  async saveDraft(
    id: string,
    input: UpdateLegalDocumentInput,
    updatedByUserId: string,
    db: DbClient = getDb(),
  ): Promise<LegalDocument | null> {
    const [row] = await db
      .update(legalDocuments)
      .set({
        titleEn: input.titleEn,
        titleAr: input.titleAr,
        contentEn: input.contentEn,
        contentAr: input.contentAr,
        updatedByUserId,
        updatedAt: new Date(),
      })
      .where(eq(legalDocuments.id, id))
      .returning();
    return row ? mapRowToDocument(row) : null;
  },

  /** Publishing bumps `version` and stamps `publishedAt` — the public
   *  page's "last updated" date is exactly this timestamp, never
   *  `updatedAt` (which would move on every draft autosave). */
  async publish(
    id: string,
    nextVersion: number,
    updatedByUserId: string,
    db: DbClient = getDb(),
  ): Promise<LegalDocument | null> {
    const [row] = await db
      .update(legalDocuments)
      .set({
        published: true,
        publishedAt: new Date(),
        version: nextVersion,
        updatedByUserId,
        updatedAt: new Date(),
      })
      .where(eq(legalDocuments.id, id))
      .returning();
    return row ? mapRowToDocument(row) : null;
  },
};
