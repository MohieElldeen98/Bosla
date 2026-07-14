import { and, asc, desc, eq, exists, ilike, ne, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { articleCategories, articles } from "@/db/schema/articles";
import type { LocalizedText } from "@/types/i18n";
import type { Article, NewArticleInput } from "@/blog/types/article";
import type { ArticleStatus } from "@/blog/types/article-status";
import {
  DEFAULT_ARTICLE_SORT_FIELD,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT_DIRECTION,
  type ArticleSearchFilters,
  type ArticleSearchResult,
} from "@/blog/types/article-search";
import type { OptimisticUpdateResult } from "@/blog/types/repository-result";

type ArticleRow = typeof articles.$inferSelect;

/** Repository-level `update` shape — every field optional;
 *  `ArticleService` builds this from the validated `UpdateArticleInput`
 *  plus its own derived fields (`readTimeMinutes`, sanitized `body`).
 *  `status`/`publishedAt` are set only by `publish`/`unpublish`;
 *  `seoMetaId` only by `attachSeoMeta`. */
export interface UpdateArticleRow {
  slug?: string;
  title?: LocalizedText;
  excerpt?: LocalizedText | null;
  body?: LocalizedText;
  coverImageId?: string | null;
  authorId?: string | null;
  categoryId?: string | null;
  status?: ArticleStatus;
  publishedAt?: Date | null;
  readTimeMinutes?: number;
  isFeatured?: boolean;
  seoMetaId?: string | null;
}

const SORT_COLUMNS = {
  updatedAt: articles.updatedAt,
  createdAt: articles.createdAt,
  publishedAt: articles.publishedAt,
  viewCount: articles.viewCount,
  slug: articles.slug,
  status: articles.status,
} as const;

function mapRowToArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title as LocalizedText,
    excerpt: (row.excerpt as LocalizedText | null) ?? null,
    body: row.body as LocalizedText,
    coverImageId: row.coverImageId,
    authorId: row.authorId,
    categoryId: row.categoryId,
    status: row.status,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    readTimeMinutes: row.readTimeMinutes,
    viewCount: row.viewCount,
    isFeatured: row.isFeatured,
    seoMetaId: row.seoMetaId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Data access for `articles`. `ArticleService` is the only caller. */
export const ArticleRepository = {
  /** Explicit `updatedAt: new Date()` on create — same millisecond-
   *  precision reasoning as `CourseRepository.create` (a JS `Date`
   *  round-trip through `expectedUpdatedAt` loses Postgres's microsecond
   *  precision, which would make the first concurrency-checked update
   *  after create spuriously conflict). */
  async create(input: NewArticleInput): Promise<Article> {
    const [row] = await getDb()
      .insert(articles)
      .values({
        slug: input.slug,
        title: input.title,
        updatedAt: new Date(),
        excerpt: input.excerpt ?? null,
        body: input.body,
        coverImageId: input.coverImageId ?? null,
        authorId: input.authorId ?? null,
        categoryId: input.categoryId ?? null,
        status: input.status ?? "draft",
        readTimeMinutes: input.readTimeMinutes ?? 1,
        isFeatured: input.isFeatured ?? false,
        seoMetaId: input.seoMetaId ?? null,
      })
      .returning();
    return mapRowToArticle(row);
  },

  async findById(id: string): Promise<Article | null> {
    const [row] = await getDb().select().from(articles).where(eq(articles.id, id)).limit(1);
    return row ? mapRowToArticle(row) : null;
  },

  async findBySlug(slug: string): Promise<Article | null> {
    const [row] = await getDb().select().from(articles).where(eq(articles.slug, slug)).limit(1);
    return row ? mapRowToArticle(row) : null;
  },

  /**
   * Server-side pagination/search/filter/sort — the admin article
   * listing's data source and, with `status: "published"` +
   * `onlyActive: true`, the public blog's too. `query` matches `slug` or
   * either locale of `title`/`excerpt` — raw jsonb `->>` extraction, same
   * as `CourseRepository.search`. Page query and total count run in
   * parallel against the same `WHERE` clause.
   */
  async search(filters: ArticleSearchFilters): Promise<ArticleSearchResult<Article>> {
    const conditions: SQL[] = [];

    if (filters.query) {
      const pattern = `%${filters.query}%`;
      conditions.push(
        or(
          ilike(articles.slug, pattern),
          ilike(sql`${articles.title}->>'en'`, pattern),
          ilike(sql`${articles.title}->>'ar'`, pattern),
          ilike(sql`${articles.excerpt}->>'en'`, pattern),
          ilike(sql`${articles.excerpt}->>'ar'`, pattern),
        ) as SQL,
      );
    }
    if (filters.status) conditions.push(eq(articles.status, filters.status));
    if (filters.categoryId) conditions.push(eq(articles.categoryId, filters.categoryId));
    if (filters.authorId) conditions.push(eq(articles.authorId, filters.authorId));
    if (filters.isFeatured !== undefined) conditions.push(eq(articles.isFeatured, filters.isFeatured));

    if (filters.onlyActive) {
      conditions.push(
        or(
          sql`${articles.categoryId} IS NULL`,
          exists(
            getDb()
              .select({ one: sql`1` })
              .from(articleCategories)
              .where(
                and(
                  eq(articleCategories.id, articles.categoryId),
                  eq(articleCategories.isActive, true),
                ),
              ),
          ),
        ) as SQL,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const sortColumn = SORT_COLUMNS[filters.sortBy ?? DEFAULT_ARTICLE_SORT_FIELD];
    const orderFn = (filters.sortDirection ?? DEFAULT_SORT_DIRECTION) === "asc" ? asc : desc;
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;

    const [rows, countRows] = await Promise.all([
      getDb()
        .select()
        .from(articles)
        .where(whereClause)
        .orderBy(orderFn(sortColumn))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      getDb()
        .select({ count: sql<number>`count(*)::int` })
        .from(articles)
        .where(whereClause),
    ]);
    const total = countRows[0]?.count ?? 0;

    return {
      items: rows.map(mapRowToArticle),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  /** Published articles in the same category, excluding the article
   *  itself — the public article page's "related articles" rail. Newest
   *  published first. */
  async findRelated(categoryId: string, excludeArticleId: string, limit = 3): Promise<Article[]> {
    const rows = await getDb()
      .select()
      .from(articles)
      .where(
        and(
          eq(articles.categoryId, categoryId),
          eq(articles.status, "published"),
          ne(articles.id, excludeArticleId),
        ),
      )
      .orderBy(desc(articles.publishedAt))
      .limit(limit);
    return rows.map(mapRowToArticle);
  },

  /** `expectedUpdatedAt` in the `WHERE` clause makes the update itself the
   *  atomic check-and-write — mirrors `CourseRepository.update` exactly. */
  async update(
    id: string,
    input: UpdateArticleRow,
    expectedUpdatedAt?: string,
  ): Promise<OptimisticUpdateResult<Article>> {
    const conditions = [eq(articles.id, id)];
    if (expectedUpdatedAt) {
      conditions.push(eq(articles.updatedAt, new Date(expectedUpdatedAt)));
    }

    const [row] = await getDb()
      .update(articles)
      .set({ ...input, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();

    if (row) return { status: "ok", data: mapRowToArticle(row) };
    if (!expectedUpdatedAt) return { status: "not_found" };

    const stillExists = await ArticleRepository.findById(id);
    return stillExists ? { status: "conflict" } : { status: "not_found" };
  },

  /** Atomic `view_count + 1` — deliberately does NOT touch `updatedAt`:
   *  a public page view isn't an edit, and bumping the concurrency
   *  timestamp on every view would spuriously conflict an admin's
   *  in-flight editor save. */
  async incrementViewCount(id: string): Promise<void> {
    await getDb()
      .update(articles)
      .set({ viewCount: sql`${articles.viewCount} + 1` })
      .where(eq(articles.id, id));
  },

  async delete(id: string): Promise<void> {
    await getDb().delete(articles).where(eq(articles.id, id));
  },
};
