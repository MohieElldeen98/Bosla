import { and, desc, eq } from "drizzle-orm";
import { getDb, type DbClient } from "@/db";
import { legalDocumentVersions } from "@/db/schema/legal";
import type { LegalDocument } from "@/cms/types/legal-document";
import type { LegalDocumentVersion, LegalDocumentVersionListItem } from "@/cms/types/legal-document-version";

type LegalDocumentVersionRow = typeof legalDocumentVersions.$inferSelect;

function mapRowToVersion(row: LegalDocumentVersionRow): LegalDocumentVersion {
  return {
    id: row.id,
    documentId: row.documentId,
    version: row.version,
    titleEn: row.titleEn,
    titleAr: row.titleAr,
    contentEn: row.contentEn,
    contentAr: row.contentAr,
    publishedAt: row.publishedAt.toISOString(),
    publishedByUserId: row.publishedByUserId,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapRowToListItem(row: LegalDocumentVersionRow): LegalDocumentVersionListItem {
  const version = mapRowToVersion(row);
  return {
    id: version.id,
    documentId: version.documentId,
    version: version.version,
    titleEn: version.titleEn,
    titleAr: version.titleAr,
    publishedAt: version.publishedAt,
    publishedByUserId: version.publishedByUserId,
    createdAt: version.createdAt,
  };
}

/** Data access for immutable legal publication snapshots. There is no update
 * or delete operation: a published version is an audit record. */
export const LegalDocumentVersionRepository = {
  async createSnapshot(
    document: LegalDocument,
    publishedByUserId: string,
    db: DbClient = getDb(),
  ): Promise<LegalDocumentVersion> {
    if (!document.publishedAt) throw new Error("Cannot snapshot an unpublished legal document.");
    const [row] = await db
      .insert(legalDocumentVersions)
      .values({
        documentId: document.id,
        version: document.version,
        titleEn: document.titleEn,
        titleAr: document.titleAr,
        contentEn: document.contentEn,
        contentAr: document.contentAr,
        publishedAt: new Date(document.publishedAt),
        publishedByUserId,
      })
      .returning();
    return mapRowToVersion(row);
  },

  async findByDocumentId(documentId: string, db: DbClient = getDb()): Promise<LegalDocumentVersionListItem[]> {
    const rows = await db
      .select()
      .from(legalDocumentVersions)
      .where(eq(legalDocumentVersions.documentId, documentId))
      .orderBy(desc(legalDocumentVersions.version));
    return rows.map(mapRowToListItem);
  },

  async findById(
    documentId: string,
    versionId: string,
    db: DbClient = getDb(),
  ): Promise<LegalDocumentVersion | null> {
    const [row] = await db
      .select()
      .from(legalDocumentVersions)
      .where(and(eq(legalDocumentVersions.documentId, documentId), eq(legalDocumentVersions.id, versionId)))
      .limit(1);
    return row ? mapRowToVersion(row) : null;
  },

  /** The direct, unambiguous lookup "the immutable snapshot for exactly
   *  this document at exactly this version number" — what both the
   *  accept flow and acceptance-enforcement need: `legalDocuments.version`
   *  always identifies the CURRENT published version, and this is how
   *  its id is resolved. */
  async findByDocumentIdAndVersion(
    documentId: string,
    version: number,
    db: DbClient = getDb(),
  ): Promise<LegalDocumentVersion | null> {
    const [row] = await db
      .select()
      .from(legalDocumentVersions)
      .where(and(eq(legalDocumentVersions.documentId, documentId), eq(legalDocumentVersions.version, version)))
      .limit(1);
    return row ? mapRowToVersion(row) : null;
  },
};
