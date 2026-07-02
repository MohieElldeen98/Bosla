import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { cmsMediaAssets } from "@/db/schema/cms";
import type { LocalizedText } from "@/types/i18n";
import type { MediaAsset } from "@/types/media";

type CmsMediaAssetRow = typeof cmsMediaAssets.$inferSelect;

function mapRowToMediaAsset(row: CmsMediaAssetRow): MediaAsset {
  return {
    id: row.id,
    url: row.url,
    alt: row.alt as LocalizedText,
    width: row.width,
    height: row.height,
    placeholder: row.placeholder ?? undefined,
  };
}

export interface NewCmsMediaAssetInput {
  url: string;
  alt: LocalizedText;
  width: number;
  height: number;
  placeholder?: string;
}

/** Data access for `cms_media_assets` — the Media Library table
 *  (docs/cms-overview.md §10). `CmsMediaService` is the only caller. No
 *  uploader UI exists yet; this is the storage/metadata layer only. */
export const CmsMediaRepository = {
  async create(input: NewCmsMediaAssetInput): Promise<MediaAsset> {
    const [row] = await getDb()
      .insert(cmsMediaAssets)
      .values({
        url: input.url,
        alt: input.alt,
        width: input.width,
        height: input.height,
        placeholder: input.placeholder ?? null,
      })
      .returning();
    return mapRowToMediaAsset(row);
  },

  async findById(id: string): Promise<MediaAsset | null> {
    const [row] = await getDb().select().from(cmsMediaAssets).where(eq(cmsMediaAssets.id, id)).limit(1);
    return row ? mapRowToMediaAsset(row) : null;
  },

  async findAll(): Promise<MediaAsset[]> {
    const rows = await getDb().select().from(cmsMediaAssets);
    return rows.map(mapRowToMediaAsset);
  },

  async delete(id: string): Promise<void> {
    await getDb().delete(cmsMediaAssets).where(eq(cmsMediaAssets.id, id));
  },
};
