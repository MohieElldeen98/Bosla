import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { cmsMediaAssets } from "@/db/schema/cms";
import {
  DEFAULT_MEDIA_PAGE_SIZE,
  DEFAULT_MEDIA_SORT_DIRECTION,
  DEFAULT_MEDIA_SORT_FIELD,
  type MediaSearchFilters,
  type MediaSearchResult,
} from "@/cms/types/media-search";
import type { LocalizedText } from "@/types/i18n";
import type { MediaAsset } from "@/types/media";
import type { MediaLibraryAsset, NewMediaLibraryAssetInput } from "@/cms/types/media-library";
import type { OptimisticUpdateResult } from "@/cms/types/repository-result";
import type {
  MediaProcessingStatus,
  MediaVariants,
  MediaVisibility,
} from "@/media/types/media-platform";

type CmsMediaAssetRow = typeof cmsMediaAssets.$inferSelect;

/** The lean projection every existing content-resolution call site
 *  (Hero, course cover images, SEO og:image, via `CmsMediaService
 *  .getById`/`.getResolvedById`) has always consumed — unchanged shape,
 *  even though the underlying columns are richer now. `alt`/`width`/
 *  `height` fall back to empty/zero for a non-image asset (a video or
 *  PDF referenced through this lean path, which shouldn't normally
 *  happen, but a `MediaAsset` contract with required fields can't
 *  express "unknown"). */
function mapRowToMediaAsset(row: CmsMediaAssetRow): MediaAsset {
  return {
    id: row.id,
    url: row.url,
    alt: (row.alt as LocalizedText | null) ?? { en: "", ar: "" },
    width: row.width ?? 0,
    height: row.height ?? 0,
    placeholder: row.placeholder ?? undefined,
  };
}

function mapRowToMediaLibraryAsset(row: CmsMediaAssetRow): MediaLibraryAsset {
  return {
    id: row.id,
    url: row.url,
    storagePath: row.storagePath,
    fileType: row.fileType,
    mimeType: row.mimeType,
    fileSize: row.fileSize,
    alt: (row.alt as LocalizedText | null) ?? null,
    title: (row.title as LocalizedText | null) ?? null,
    caption: (row.caption as LocalizedText | null) ?? null,
    description: (row.description as LocalizedText | null) ?? null,
    tags: (row.tags as string[]) ?? [],
    folder: row.folder,
    width: row.width,
    height: row.height,
    placeholder: row.placeholder,
    uploadedByUserId: row.uploadedByUserId,
    storageKey: row.storageKey,
    thumbnailKey: row.thumbnailKey,
    variants: (row.variants as MediaVariants) ?? {},
    duration: row.duration,
    processingStatus: row.processingStatus,
    visibility: row.visibility,
    dominantColor: row.dominantColor,
    pageCount: row.pageCount,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export interface UpdateMediaAssetRow {
  alt?: LocalizedText | null;
  title?: LocalizedText | null;
  caption?: LocalizedText | null;
  description?: LocalizedText | null;
  tags?: string[];
  folder?: string | null;
  url?: string;
  storageKey?: string | null;
  fileType?: MediaLibraryAsset["fileType"];
  thumbnailKey?: string | null;
  variants?: MediaVariants;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  fileSize?: number;
  mimeType?: string;
  processingStatus?: MediaProcessingStatus;
  visibility?: MediaVisibility;
  dominantColor?: string | null;
  pageCount?: number | null;
  placeholder?: string | null;
}

const SORT_COLUMNS = {
  createdAt: cmsMediaAssets.createdAt,
  fileSize: cmsMediaAssets.fileSize,
  lastUsedAt: cmsMediaAssets.lastUsedAt,
} as const;

/** Data access for `cms_media_assets` — the Media Library (Phase 7, Step
 *  7.1). `CmsMediaService` is the only caller. Two shapes out of the
 *  same table on purpose: `findById` keeps returning the lean
 *  `MediaAsset` every existing content-resolution call site already
 *  depends on; `findLibraryById`/`search`/`create`/`update` return the
 *  full `MediaLibraryAsset` the admin grid and `MediaPicker` need. */
export const CmsMediaRepository = {
  async findById(id: string): Promise<MediaAsset | null> {
    const [row] = await getDb().select().from(cmsMediaAssets).where(eq(cmsMediaAssets.id, id)).limit(1);
    return row ? mapRowToMediaAsset(row) : null;
  },

  async findLibraryById(id: string): Promise<MediaLibraryAsset | null> {
    const [row] = await getDb().select().from(cmsMediaAssets).where(eq(cmsMediaAssets.id, id)).limit(1);
    return row ? mapRowToMediaLibraryAsset(row) : null;
  },

  async findByIds(ids: string[]): Promise<MediaLibraryAsset[]> {
    if (ids.length === 0) return [];
    const rows = await getDb()
      .select()
      .from(cmsMediaAssets)
      .where(sql`${cmsMediaAssets.id} = ANY(${ids})`);
    return rows.map(mapRowToMediaLibraryAsset);
  },

  async search(filters: MediaSearchFilters): Promise<MediaSearchResult<MediaLibraryAsset>> {
    const conditions: SQL[] = [];

    if (filters.query) {
      const pattern = `%${filters.query}%`;
      conditions.push(
        or(
          ilike(sql`${cmsMediaAssets.title}->>'en'`, pattern),
          ilike(sql`${cmsMediaAssets.title}->>'ar'`, pattern),
          ilike(sql`${cmsMediaAssets.alt}->>'en'`, pattern),
          ilike(sql`${cmsMediaAssets.alt}->>'ar'`, pattern),
          ilike(sql`${cmsMediaAssets.caption}->>'en'`, pattern),
          ilike(sql`${cmsMediaAssets.caption}->>'ar'`, pattern),
          ilike(sql`${cmsMediaAssets.description}->>'en'`, pattern),
          ilike(sql`${cmsMediaAssets.description}->>'ar'`, pattern),
          ilike(sql`${cmsMediaAssets.tags}::text`, pattern),
          ilike(sql`${cmsMediaAssets.storagePath}`, pattern),
        ) as SQL,
      );
    }
    if (filters.fileType) conditions.push(eq(cmsMediaAssets.fileType, filters.fileType));
    if (filters.uploadedByUserId) {
      conditions.push(eq(cmsMediaAssets.uploadedByUserId, filters.uploadedByUserId));
    }
    if (filters.folder) conditions.push(eq(cmsMediaAssets.folder, filters.folder));
    if (filters.tag) {
      conditions.push(sql`${cmsMediaAssets.tags} @> ${JSON.stringify([filters.tag])}::jsonb`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const sortColumn = SORT_COLUMNS[filters.sortBy ?? DEFAULT_MEDIA_SORT_FIELD];
    const orderFn = (filters.sortDirection ?? DEFAULT_MEDIA_SORT_DIRECTION) === "asc" ? asc : desc;
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = filters.pageSize ?? DEFAULT_MEDIA_PAGE_SIZE;

    const [rows, countRows] = await Promise.all([
      getDb()
        .select()
        .from(cmsMediaAssets)
        .where(whereClause)
        .orderBy(orderFn(sortColumn))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      getDb()
        .select({ count: sql<number>`count(*)::int` })
        .from(cmsMediaAssets)
        .where(whereClause),
    ]);
    const total = countRows[0]?.count ?? 0;

    return {
      items: rows.map(mapRowToMediaLibraryAsset),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  /** Distinct, non-null folder names in use — feeds the admin grid's
   *  folder filter and the upload form's "existing folders" suggestions,
   *  without a separate `media_folders` table (a folder has no identity
   *  of its own beyond being a label some assets share). */
  async listFolders(): Promise<string[]> {
    const rows = await getDb()
      .selectDistinct({ folder: cmsMediaAssets.folder })
      .from(cmsMediaAssets)
      .where(sql`${cmsMediaAssets.folder} IS NOT NULL`)
      .orderBy(asc(cmsMediaAssets.folder));
    return rows.map((row) => row.folder).filter((folder): folder is string => folder !== null);
  },

  /** Inserts with a caller-supplied `id` (not the column's own default)
   *  — the Media Library Service generates the id *before* upload so the
   *  same value can be used as the Storage object path, then this row
   *  has to land under that exact id, not a fresh one the DB would
   *  otherwise generate. */
  async create(input: NewMediaLibraryAssetInput): Promise<MediaLibraryAsset> {
    const [row] = await getDb()
      .insert(cmsMediaAssets)
      .values({
        id: input.id,
        url: input.url,
        storagePath: input.storagePath,
        fileType: input.fileType,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        alt: input.alt ?? null,
        title: input.title ?? null,
        caption: input.caption ?? null,
        description: input.description ?? null,
        tags: input.tags ?? [],
        folder: input.folder ?? null,
        width: input.width ?? null,
        height: input.height ?? null,
        placeholder: input.placeholder ?? null,
        uploadedByUserId: input.uploadedByUserId ?? null,
        storageKey: input.storageKey ?? null,
        processingStatus: input.processingStatus ?? "completed",
        visibility: input.visibility ?? "public",
        relatedEntity: input.relatedEntity ?? null,
        relatedEntityId: input.relatedEntityId ?? null,
        updatedAt: new Date(),
      })
      .returning();
    return mapRowToMediaLibraryAsset(row);
  },

  /** Best-effort "recently used" signal — fire-and-forget from delivery/
   *  resolution paths, never awaited on a render-critical path. */
  async touchLastUsed(id: string): Promise<void> {
    await getDb()
      .update(cmsMediaAssets)
      .set({ lastUsedAt: new Date() })
      .where(eq(cmsMediaAssets.id, id));
  },

  /** Duplicate prevention: same uploader re-dropping the same bytes
   *  (matched by size + original file name in `title`) reuses the
   *  existing asset instead of storing a second copy. */
  async findDuplicate(
    uploadedByUserId: string,
    fileSize: number,
    fileName: string,
  ): Promise<MediaLibraryAsset | null> {
    const [row] = await getDb()
      .select()
      .from(cmsMediaAssets)
      .where(
        and(
          eq(cmsMediaAssets.uploadedByUserId, uploadedByUserId),
          eq(cmsMediaAssets.fileSize, fileSize),
          sql`${cmsMediaAssets.title}->>'en' = ${fileName}`,
          sql`${cmsMediaAssets.storageKey} IS NOT NULL`,
          sql`${cmsMediaAssets.processingStatus} <> 'failed'`,
        ),
      )
      .limit(1);
    return row ? mapRowToMediaLibraryAsset(row) : null;
  },

  /** Same optimistic-concurrency shape as every other domain's
   *  `update` — see `ModuleRepository.update`'s doc comment. */
  async update(
    id: string,
    input: UpdateMediaAssetRow,
    expectedUpdatedAt?: string,
  ): Promise<OptimisticUpdateResult<MediaLibraryAsset>> {
    const conditions = [eq(cmsMediaAssets.id, id)];
    if (expectedUpdatedAt) conditions.push(eq(cmsMediaAssets.updatedAt, new Date(expectedUpdatedAt)));

    const [row] = await getDb()
      .update(cmsMediaAssets)
      .set({ ...input, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();

    if (row) return { status: "ok", data: mapRowToMediaLibraryAsset(row) };
    if (!expectedUpdatedAt) return { status: "not_found" };

    const stillExists = await CmsMediaRepository.findLibraryById(id);
    return stillExists ? { status: "conflict" } : { status: "not_found" };
  },

  async delete(id: string): Promise<void> {
    await getDb().delete(cmsMediaAssets).where(eq(cmsMediaAssets.id, id));
  },
};
