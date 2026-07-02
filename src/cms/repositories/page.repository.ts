import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { cmsPages } from "@/db/schema/cms";
import type { CmsPage, NewCmsPageInput } from "@/cms/types/page";
import type { UpdatePageInput } from "@/cms/validators/page.validator";

type CmsPageRow = typeof cmsPages.$inferSelect;

function mapRowToPage(row: CmsPageRow): CmsPage {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    seoMetaId: row.seoMetaId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Data access for `cms_pages`. `CmsPageService` is the only caller —
 * validation, authorization, and section/SEO resolution all live there.
 */
export const CmsPageRepository = {
  async create(input: NewCmsPageInput): Promise<CmsPage> {
    const [row] = await getDb()
      .insert(cmsPages)
      .values({ slug: input.slug, title: input.title, seoMetaId: input.seoMetaId ?? null })
      .returning();
    return mapRowToPage(row);
  },

  async findById(id: string): Promise<CmsPage | null> {
    const [row] = await getDb().select().from(cmsPages).where(eq(cmsPages.id, id)).limit(1);
    return row ? mapRowToPage(row) : null;
  },

  async findBySlug(slug: string): Promise<CmsPage | null> {
    const [row] = await getDb().select().from(cmsPages).where(eq(cmsPages.slug, slug)).limit(1);
    return row ? mapRowToPage(row) : null;
  },

  async findAll(): Promise<CmsPage[]> {
    const rows = await getDb().select().from(cmsPages);
    return rows.map(mapRowToPage);
  },

  async update(id: string, input: UpdatePageInput): Promise<CmsPage | null> {
    const [row] = await getDb()
      .update(cmsPages)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(cmsPages.id, id))
      .returning();
    return row ? mapRowToPage(row) : null;
  },

  async delete(id: string): Promise<void> {
    await getDb().delete(cmsPages).where(eq(cmsPages.id, id));
  },
};
