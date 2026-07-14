import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { articleCategories } from "@/db/schema/articles";
import type { LocalizedText } from "@/types/i18n";
import type { ArticleCategory, NewArticleCategoryInput } from "@/blog/types/article-category";
import type { UpdateArticleCategoryInput } from "@/blog/validators/article-category.validator";

type ArticleCategoryRow = typeof articleCategories.$inferSelect;

function mapRowToCategory(row: ArticleCategoryRow): ArticleCategory {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name as LocalizedText,
    description: (row.description as LocalizedText | null) ?? null,
    icon: row.icon,
    isActive: row.isActive,
    displayOrder: row.displayOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Data access for `article_categories`. `ArticleCategoryService` is the
 *  only caller. */
export const ArticleCategoryRepository = {
  async create(input: NewArticleCategoryInput): Promise<ArticleCategory> {
    const [row] = await getDb()
      .insert(articleCategories)
      .values({
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
        icon: input.icon ?? null,
        isActive: input.isActive ?? true,
        displayOrder: input.displayOrder ?? 0,
      })
      .returning();
    return mapRowToCategory(row);
  },

  async findById(id: string): Promise<ArticleCategory | null> {
    const [row] = await getDb()
      .select()
      .from(articleCategories)
      .where(eq(articleCategories.id, id))
      .limit(1);
    return row ? mapRowToCategory(row) : null;
  },

  async findBySlug(slug: string): Promise<ArticleCategory | null> {
    const [row] = await getDb()
      .select()
      .from(articleCategories)
      .where(eq(articleCategories.slug, slug))
      .limit(1);
    return row ? mapRowToCategory(row) : null;
  },

  /** Ordered by `displayOrder` ascending. */
  async findAll(): Promise<ArticleCategory[]> {
    const rows = await getDb()
      .select()
      .from(articleCategories)
      .orderBy(asc(articleCategories.displayOrder));
    return rows.map(mapRowToCategory);
  },

  /** Batch lookup — for composing a page of articles with their category
   *  names resolved without one query per row. */
  async findByIds(ids: string[]): Promise<ArticleCategory[]> {
    if (ids.length === 0) return [];
    const rows = await getDb()
      .select()
      .from(articleCategories)
      .where(inArray(articleCategories.id, ids));
    return rows.map(mapRowToCategory);
  },

  async update(id: string, input: UpdateArticleCategoryInput): Promise<ArticleCategory | null> {
    const [row] = await getDb()
      .update(articleCategories)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(articleCategories.id, id))
      .returning();
    return row ? mapRowToCategory(row) : null;
  },

  async delete(id: string): Promise<void> {
    await getDb().delete(articleCategories).where(eq(articleCategories.id, id));
  },
};
