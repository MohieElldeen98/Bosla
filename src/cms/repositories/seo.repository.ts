import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { cmsSeoMeta } from "@/db/schema/cms";
import type { LocalizedText } from "@/types/i18n";
import type { NewSeoMetaInput, SeoMeta } from "@/cms/types/seo";

type CmsSeoMetaRow = typeof cmsSeoMeta.$inferSelect;

function mapRowToSeoMeta(row: CmsSeoMetaRow): SeoMeta {
  return {
    id: row.id,
    title: (row.title as LocalizedText | null) ?? null,
    description: (row.description as LocalizedText | null) ?? null,
    ogImageId: row.ogImageId,
    canonicalPath: row.canonicalPath,
  };
}

/** Data access for `cms_seo_meta`. `CmsSeoService` is the only caller. */
export const CmsSeoRepository = {
  async create(input: NewSeoMetaInput): Promise<SeoMeta> {
    const [row] = await getDb()
      .insert(cmsSeoMeta)
      .values({
        title: input.title ?? null,
        description: input.description ?? null,
        ogImageId: input.ogImageId ?? null,
        canonicalPath: input.canonicalPath ?? null,
      })
      .returning();
    return mapRowToSeoMeta(row);
  },

  async findById(id: string): Promise<SeoMeta | null> {
    const [row] = await getDb().select().from(cmsSeoMeta).where(eq(cmsSeoMeta.id, id)).limit(1);
    return row ? mapRowToSeoMeta(row) : null;
  },

  async update(id: string, input: NewSeoMetaInput): Promise<SeoMeta | null> {
    const [row] = await getDb()
      .update(cmsSeoMeta)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(cmsSeoMeta.id, id))
      .returning();
    return row ? mapRowToSeoMeta(row) : null;
  },

  async delete(id: string): Promise<void> {
    await getDb().delete(cmsSeoMeta).where(eq(cmsSeoMeta.id, id));
  },
};
