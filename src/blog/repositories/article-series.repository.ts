import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { articleSeries } from "@/db/schema/articles";
import type { LocalizedText } from "@/types/i18n";
import type { ArticleSeries, NewArticleSeriesInput } from "@/blog/types/article-series";
import type { UpdateArticleSeriesInput } from "@/blog/validators/article-series.validator";

type Row = typeof articleSeries.$inferSelect;
function map(row: Row): ArticleSeries {
  return { ...row, title: row.title as LocalizedText, description: row.description as LocalizedText | null,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}
export const ArticleSeriesRepository = {
  async create(input: NewArticleSeriesInput) { const [row] = await getDb().insert(articleSeries).values({ ...input, description: input.description ?? null }).returning(); return map(row); },
  async findById(id: string) { const [row] = await getDb().select().from(articleSeries).where(eq(articleSeries.id, id)).limit(1); return row ? map(row) : null; },
  async findBySlug(slug: string) { const [row] = await getDb().select().from(articleSeries).where(eq(articleSeries.slug, slug)).limit(1); return row ? map(row) : null; },
  async findAll() { return (await getDb().select().from(articleSeries).orderBy(asc(articleSeries.displayOrder))).map(map); },
  async update(id: string, input: UpdateArticleSeriesInput) { const [row] = await getDb().update(articleSeries).set({ ...input, updatedAt: new Date() }).where(eq(articleSeries.id, id)).returning(); return row ? map(row) : null; },
  async delete(id: string) { await getDb().delete(articleSeries).where(eq(articleSeries.id, id)); },
};
