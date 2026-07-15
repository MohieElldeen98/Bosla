import { ArticleRepository, type UpdateArticleRow } from "@/blog/repositories/article.repository";
import { ArticleCategoryRepository } from "@/blog/repositories/article-category.repository";
import { ProfileRepository } from "@/auth/repositories/profile.repository";
import {
  isBlogManager,
  requireBlogAuthorAccess,
  requireBlogManagementAccess,
} from "@/blog/utils/require-blog-access";
import { recordArticleAuditLog } from "@/blog/utils/audit-log";
import { generateUniqueSlug } from "@/blog/utils/generate-slug";
import { sanitizeArticleHtml } from "@/blog/utils/sanitize-article-html";
import { calculateReadTimeMinutes } from "@/blog/utils/read-time";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { CmsMediaService } from "@/cms/services/media.service";
import { CmsSeoService } from "@/cms/services/seo.service";
import { safeMutation, safeRead } from "@/blog/utils/safe-operation";
import type { Locale } from "@/i18n/routing";
import type { LocalizedText } from "@/types/i18n";
import type { AuthUser } from "@/auth/types/session";
import type { Profile } from "@/auth/types/profile";
import type { Article } from "@/blog/types/article";
import type { BlogActionResult } from "@/blog/types/result";
import type { CreateArticleInput, UpdateArticleInput } from "@/blog/validators/article.validator";
import type {
  ArticleListItem,
  ArticleSearchFilters,
  ArticleSearchResult,
  PublicArticleDetail,
} from "@/blog/types/article-search";

/** Resolves a page of rows' unique authors in one batch of parallel
 *  lookups — `ProfileRepository` has no `findByIds` (profile-id batch),
 *  and a blog realistically has a handful of unique authors per page, so
 *  one `findById` per *unique* author is fine. */
async function resolveAuthors(authorIds: string[]): Promise<Map<string, Profile>> {
  const uniqueIds = [...new Set(authorIds)];
  const profiles = await Promise.all(
    uniqueIds.map((id) => safeRead(() => ProfileRepository.findById(id), null)),
  );
  return new Map(
    profiles.filter((profile): profile is Profile => profile !== null).map((p) => [p.id, p]),
  );
}

function authorDisplayName(profile: Profile | undefined): string | null {
  if (!profile) return null;
  return profile.displayName || profile.fullName || null;
}

/** Articles are written in ONE language (`articles.language`), but the
 *  stored `title`/`excerpt`/`body` keep the `LocalizedText` shape every
 *  read path expects — the single written text is mirrored into both
 *  locale keys here, at the write boundary (see the schema doc comment). */
function mirrorText(value: string): LocalizedText {
  return { en: value, ar: value };
}

/** Whether `actingUser` is the article's own author — resolves the
 *  caller's profile row (`articles.author_id` references `profiles.id`,
 *  not the auth uid), same bridge-walking `CourseService.ownsCourse`
 *  does. */
async function ownsArticle(actingUser: AuthUser, article: Article): Promise<boolean> {
  if (!article.authorId) return false;
  const profile = await safeRead(() => ProfileRepository.findByUserId(actingUser.id), null);
  return !!profile && profile.id === article.authorId;
}

/**
 * The one authorization rule every article mutation shares: blog managers
 * (Admin/Super Admin) may touch any article; an author (Instructor) only
 * their own. Returns the verified user + article, or the failure the
 * caller returns as-is.
 */
async function requireArticleAccess(
  id: string,
): Promise<{ ok: true; user: AuthUser; article: Article } | { ok: false; failure: BlogActionResult<never> }> {
  const user = await requireBlogAuthorAccess();
  if (!user) {
    return {
      ok: false,
      failure: { success: false, code: "forbidden", message: "You cannot manage blog articles." },
    };
  }
  const article = await ArticleRepository.findById(id);
  if (!article) {
    return { ok: false, failure: { success: false, code: "not_found", message: "Article not found." } };
  }
  if (!isBlogManager(user) && !(await ownsArticle(user, article))) {
    return {
      ok: false,
      failure: { success: false, code: "forbidden", message: "You can only manage your own articles." },
    };
  }
  return { ok: true, user, article };
}

/** Shared by `update`'s repository call — not-found/conflict handling and
 *  audit log, same shape as `applyCourseUpdate`. */
async function applyArticleUpdate(
  id: string,
  row: UpdateArticleRow,
  expectedUpdatedAt: string | undefined,
  actorId: string,
): Promise<BlogActionResult<Article>> {
  const result = await ArticleRepository.update(id, row, expectedUpdatedAt);
  if (result.status === "not_found") {
    return { success: false, code: "not_found", message: "Article not found." };
  }
  if (result.status === "conflict") {
    return {
      success: false,
      code: "conflict",
      message: "This article was changed by someone else. Reload the page to see the latest version.",
    };
  }
  await recordArticleAuditLog({ action: "update", articleId: id, actorId });
  return { success: true, data: result.data };
}

/**
 * Orchestration for `articles` — authorization on every mutation,
 * uniqueness on `slug`, body sanitization + read-time derivation on every
 * body write, locale resolution for reads, and the publish/unpublish
 * transitions. `ArticleRepository` is pure data access. Mutations are
 * author-or-manager gated (`requireArticleAccess`): blog managers
 * (Admin/Super Admin) manage any article, Instructors author and manage
 * their own from the public blog — no Admin Panel required.
 */
export const ArticleService = {
  async getById(id: string): Promise<Article | null> {
    return safeRead(() => ArticleRepository.findById(id), null);
  },

  async getBySlug(slug: string): Promise<Article | null> {
    return safeRead(() => ArticleRepository.findBySlug(slug), null);
  },

  /**
   * The admin listing's and the public blog's shared data source —
   * paginated/filtered/sorted articles with category names, author names,
   * and cover image URLs resolved, composed from parallel repository reads
   * (the same pattern as `CourseService.searchResolved`).
   */
  async searchResolved(
    filters: ArticleSearchFilters,
    locale: Locale,
  ): Promise<ArticleSearchResult<ArticleListItem>> {
    const result = await safeRead(() => ArticleRepository.search(filters), {
      items: [] as Article[],
      total: 0,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 12,
      totalPages: 1,
    });

    const categoryIds = [
      ...new Set(
        result.items.map((article) => article.categoryId).filter((id): id is string => id !== null),
      ),
    ];
    const authorIds = result.items
      .map((article) => article.authorId)
      .filter((id): id is string => id !== null);
    const coverImageIds = [
      ...new Set(
        result.items
          .map((article) => article.coverImageId)
          .filter((id): id is string => id !== null),
      ),
    ];

    const [categories, authorById, coverImages] = await Promise.all([
      safeRead(() => ArticleCategoryRepository.findByIds(categoryIds), []),
      resolveAuthors(authorIds),
      Promise.all(coverImageIds.map((id) => CmsMediaService.getResolvedById(id, locale))),
    ]);

    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const coverImageById = new Map(
      coverImageIds
        .map((id, index) => [id, coverImages[index]] as const)
        .filter(
          (entry): entry is [string, NonNullable<(typeof coverImages)[number]>] =>
            entry[1] !== null,
        ),
    );

    const items: ArticleListItem[] = result.items.map((article) => {
      const category = article.categoryId ? categoryById.get(article.categoryId) : undefined;
      const author = article.authorId ? authorById.get(article.authorId) : undefined;
      const coverImage = article.coverImageId
        ? coverImageById.get(article.coverImageId)
        : undefined;

      return {
        id: article.id,
        slug: article.slug,
        title: resolveLocalizedText(article.title, locale),
        excerpt: resolveLocalizedText(article.excerpt, locale),
        language: article.language,
        categoryId: article.categoryId,
        categoryName: category ? resolveLocalizedText(category.name, locale) : null,
        categorySlug: category?.slug ?? null,
        authorName: authorDisplayName(author),
        authorAvatarUrl: author?.avatarUrl ?? null,
        status: article.status,
        publishedAt: article.publishedAt,
        readTimeMinutes: article.readTimeMinutes,
        viewCount: article.viewCount,
        isFeatured: article.isFeatured,
        coverImageUrl: coverImage?.url ?? null,
        updatedAt: article.updatedAt,
      };
    });

    return { ...result, items };
  },

  /** The public listing's "Most popular" rail — pinned (`isFeatured`)
   *  articles first, topped up with the most-viewed published ones, deduped.
   *  Both reads reuse `searchResolved` so the card shape stays identical. */
  async listPopular(locale: Locale, limit = 6): Promise<ArticleListItem[]> {
    const [pinned, mostViewed] = await Promise.all([
      ArticleService.searchResolved(
        {
          status: "published",
          isFeatured: true,
          onlyActive: true,
          sortBy: "publishedAt",
          sortDirection: "desc",
          pageSize: limit,
        },
        locale,
      ),
      ArticleService.searchResolved(
        {
          status: "published",
          onlyActive: true,
          sortBy: "viewCount",
          sortDirection: "desc",
          pageSize: limit,
        },
        locale,
      ),
    ]);

    const seen = new Set<string>();
    const merged: ArticleListItem[] = [];
    for (const item of [...pinned.items, ...mostViewed.items]) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
      if (merged.length >= limit) break;
    }
    return merged;
  },

  /** "Related articles" on the public article page — same category,
   *  published, excluding the article itself. */
  async listRelated(article: Article, locale: Locale, limit = 3): Promise<ArticleListItem[]> {
    if (!article.categoryId) return [];
    const related = await safeRead(
      () => ArticleRepository.findRelated(article.categoryId!, article.id, limit),
      [],
    );
    if (related.length === 0) return [];

    // Reuses the searchResolved composition for the same card shape by
    // resolving the small fixed set directly.
    const result = await ArticleService.searchResolved(
      {
        status: "published",
        categoryId: article.categoryId,
        onlyActive: true,
        sortBy: "publishedAt",
        sortDirection: "desc",
        pageSize: limit + 1,
      },
      locale,
    );
    return result.items.filter((item) => item.id !== article.id).slice(0, limit);
  },

  /**
   * The public article page's data source — a published article with
   * category/author/cover/SEO resolved, composed the same way
   * `CourseService.getPublicDetailBySlug` is. Returns `null` for a missing
   * slug *and* for an article that exists but isn't public (draft, or its
   * category deactivated) — both render as 404, indistinguishably.
   */
  async getPublicDetailBySlug(slug: string, locale: Locale): Promise<PublicArticleDetail | null> {
    const article = await safeRead(() => ArticleRepository.findBySlug(slug), null);
    if (!article || article.status !== "published") return null;

    const [category, author] = await Promise.all([
      article.categoryId
        ? safeRead(() => ArticleCategoryRepository.findById(article.categoryId!), null)
        : Promise.resolve(null),
      article.authorId
        ? safeRead(() => ProfileRepository.findById(article.authorId!), null)
        : Promise.resolve(null),
    ]);
    if (article.categoryId && !category?.isActive) return null;

    const [coverImage, seo] = await Promise.all([
      article.coverImageId
        ? CmsMediaService.getResolvedById(article.coverImageId, locale)
        : Promise.resolve(null),
      article.seoMetaId ? CmsSeoService.getResolved(article.seoMetaId, locale) : Promise.resolve(null),
    ]);
    const seoOgImage = seo?.ogImageId
      ? await CmsMediaService.getResolvedById(seo.ogImageId, locale)
      : null;

    return {
      id: article.id,
      slug: article.slug,
      title: resolveLocalizedText(article.title, locale),
      excerpt: resolveLocalizedText(article.excerpt, locale),
      language: article.language,
      bodyHtml: resolveLocalizedText(article.body, locale),
      references: article.references,
      categoryId: article.categoryId,
      categoryName: category ? resolveLocalizedText(category.name, locale) : null,
      categorySlug: category?.slug ?? null,
      authorName: authorDisplayName(author ?? undefined),
      authorAvatarUrl: author?.avatarUrl ?? null,
      authorBio: author?.bio ?? null,
      publishedAt: article.publishedAt,
      readTimeMinutes: article.readTimeMinutes,
      coverImageUrl: coverImage?.url ?? null,
      seoTitle: seo?.title ?? null,
      seoDescription: seo?.description ?? null,
      seoOgImageUrl: seoOgImage?.url ?? null,
      seoCanonicalPath: seo?.canonicalPath ?? null,
    };
  },

  /** Best-effort view counting from the public article page — a failure
   *  must never affect the page render, and a view is not an edit (see
   *  `ArticleRepository.incrementViewCount` on why `updatedAt` is
   *  untouched). */
  async registerView(id: string): Promise<void> {
    await safeRead(() => ArticleRepository.incrementViewCount(id), undefined);
  },

  /** For the author-facing edit page and the article page's Edit button —
   *  "may this signed-in user manage this article" as one reusable
   *  question (blog manager, or the article's own author). */
  async canManageArticle(actingUser: AuthUser, article: Article): Promise<boolean> {
    if (isBlogManager(actingUser)) return true;
    return ownsArticle(actingUser, article);
  },

  /**
   * "My articles" (the public blog's author strip) — reuses
   * `searchResolved` for the composition but forces `authorId` to the
   * caller's own profile, never read from `filters` (the same enforcement
   * point `CourseService.searchResolvedForInstructor` is built on), so
   * draft titles are only ever listed to their own author.
   */
  async searchResolvedForAuthor(
    actingUser: AuthUser,
    filters: ArticleSearchFilters,
    locale: Locale,
  ): Promise<ArticleSearchResult<ArticleListItem>> {
    const profile = await safeRead(() => ProfileRepository.findByUserId(actingUser.id), null);
    if (!profile) {
      const pageSize = filters.pageSize ?? 12;
      return { items: [], total: 0, page: filters.page ?? 1, pageSize, totalPages: 1 };
    }
    return ArticleService.searchResolved({ ...filters, authorId: profile.id }, locale);
  },

  /**
   * Creates the article — body sanitized, read time derived, author set
   * to the acting user's profile — then best-effort-attaches a fresh
   * `cms_seo_meta` row, exactly like `CourseService.create` (a transient
   * SEO-creation failure never blocks creating the article). Open to
   * authors (Instructors), not just blog managers; `isFeatured` is a
   * curation flag, so a non-manager's value is forced off.
   */
  async create(input: CreateArticleInput): Promise<BlogActionResult<Article>> {
    return safeMutation(async () => {
      const user = await requireBlogAuthorAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot write blog articles." };
      }

      const body = mirrorText(sanitizeArticleHtml(input.body));
      const authorProfile = await safeRead(() => ProfileRepository.findByUserId(user.id), null);

      const created = await ArticleRepository.create({
        // Never author-chosen — generated from the title, collision-proof
        // (two authors titling identically get two distinct URLs), and
        // immutable afterward. See `blog/utils/generate-slug.ts`.
        slug: await generateUniqueSlug(input.title),
        title: mirrorText(input.title),
        excerpt: input.excerpt ? mirrorText(input.excerpt) : null,
        body,
        references: input.references,
        coverImageId: input.coverImageId ?? null,
        authorId: authorProfile?.id ?? null,
        categoryId: input.categoryId ?? null,
        language: input.language,
        // Publish-on-create is the editor's primary action ("I wrote it,
        // I want it live") — draft is the explicit secondary choice.
        status: input.publish ? "published" : "draft",
        publishedAt: input.publish ? new Date() : null,
        readTimeMinutes: calculateReadTimeMinutes(body),
        isFeatured: isBlogManager(user) ? input.isFeatured : false,
      });

      await recordArticleAuditLog({ action: "create", articleId: created.id, actorId: user.id });
      if (input.publish) {
        await recordArticleAuditLog({ action: "publish", articleId: created.id, actorId: user.id });
      }

      const seoResult = await CmsSeoService.create({});
      if (!seoResult.success) return { success: true, data: created };
      const attached = await ArticleRepository.update(created.id, { seoMetaId: seoResult.data.id });
      return { success: true, data: attached.status === "ok" ? attached.data : created };
    });
  },

  /** `expectedUpdatedAt` enforces the same optimistic concurrency as the
   *  Course Editor. Does not touch `status` — see `publish`/`unpublish`.
   *  Author-or-manager gated (`requireArticleAccess`); a non-manager's
   *  `isFeatured` is stripped, same reasoning as `create`. */
  async update(
    id: string,
    input: UpdateArticleInput,
    expectedUpdatedAt?: string,
  ): Promise<BlogActionResult<Article>> {
    return safeMutation(async () => {
      const access = await requireArticleAccess(id);
      if (!access.ok) return access.failure;
      const { user } = access;

      const row: UpdateArticleRow = {};
      if (input.title !== undefined) row.title = mirrorText(input.title);
      if (input.excerpt !== undefined) row.excerpt = input.excerpt ? mirrorText(input.excerpt) : null;
      if (input.body !== undefined) {
        const body = mirrorText(sanitizeArticleHtml(input.body));
        row.body = body;
        row.readTimeMinutes = calculateReadTimeMinutes(body);
      }
      if (input.references !== undefined) row.references = input.references;
      if (input.language !== undefined) row.language = input.language;
      if (input.coverImageId !== undefined) row.coverImageId = input.coverImageId;
      if (input.categoryId !== undefined) row.categoryId = input.categoryId;
      if (input.isFeatured !== undefined && isBlogManager(user)) row.isFeatured = input.isFeatured;

      return applyArticleUpdate(id, row, expectedUpdatedAt, user.id);
    });
  },

  /** `draft -> published`. `publishedAt` is set on *first* publish only —
   *  re-publishing after an unpublish keeps the original date, so the
   *  public "Posted ..." history doesn't rewrite itself. Authors publish
   *  their own articles directly — deliberately no review workflow like
   *  courses have; only trusted roles reach this gate. */
  async publish(id: string, expectedUpdatedAt?: string): Promise<BlogActionResult<Article>> {
    return safeMutation(async () => {
      const access = await requireArticleAccess(id);
      if (!access.ok) return access.failure;
      const { user, article } = access;
      if (article.status === "published") {
        return { success: true, data: article };
      }

      const row: UpdateArticleRow = { status: "published" };
      if (!article.publishedAt) row.publishedAt = new Date();

      const result = await ArticleRepository.update(id, row, expectedUpdatedAt);
      if (result.status === "not_found") {
        return { success: false, code: "not_found", message: "Article not found." };
      }
      if (result.status === "conflict") {
        return {
          success: false,
          code: "conflict",
          message: "This article was changed by someone else. Reload the page to see the latest version.",
        };
      }
      await recordArticleAuditLog({ action: "publish", articleId: id, actorId: user.id });
      return { success: true, data: result.data };
    });
  },

  /** `published -> draft` — the reversible "take this down" action. */
  async unpublish(id: string, expectedUpdatedAt?: string): Promise<BlogActionResult<Article>> {
    return safeMutation(async () => {
      const access = await requireArticleAccess(id);
      if (!access.ok) return access.failure;
      const { user } = access;
      const result = await ArticleRepository.update(id, { status: "draft" }, expectedUpdatedAt);
      if (result.status === "not_found") {
        return { success: false, code: "not_found", message: "Article not found." };
      }
      if (result.status === "conflict") {
        return {
          success: false,
          code: "conflict",
          message: "This article was changed by someone else. Reload the page to see the latest version.",
        };
      }
      await recordArticleAuditLog({ action: "unpublish", articleId: id, actorId: user.id });
      return { success: true, data: result.data };
    });
  },

  /** Hard delete — Admin-level (not Super-Admin-only like course delete):
   *  an article has no dependent money data (orders/enrollments), and
   *  `unpublish` already covers the reversible case. The audit row is
   *  written before the delete since `article_audit_logs` cascades on
   *  `article_id`. */
  async delete(id: string): Promise<BlogActionResult> {
    return safeMutation(async () => {
      const access = await requireArticleAccess(id);
      if (!access.ok) return access.failure;
      await recordArticleAuditLog({ action: "delete", articleId: id, actorId: access.user.id });
      await ArticleRepository.delete(id);
      return { success: true, data: undefined };
    });
  },

  /** Fallback for an article whose `seoMetaId` is still `null` —
   *  idempotent, mirrors `CourseService.attachSeoMeta`. Manager-only:
   *  SEO editing itself goes through the CMS gate, so an author has no
   *  SEO surface to attach for. */
  async attachSeoMeta(id: string): Promise<BlogActionResult<Article>> {
    return safeMutation(async () => {
      const user = await requireBlogManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage the blog." };
      }
      const article = await ArticleRepository.findById(id);
      if (!article) {
        return { success: false, code: "not_found", message: "Article not found." };
      }
      if (article.seoMetaId) {
        return { success: true, data: article };
      }
      const seoResult = await CmsSeoService.create({});
      if (!seoResult.success) {
        return { success: false, code: "unknown", message: "Could not create the SEO record." };
      }
      const result = await ArticleRepository.update(id, { seoMetaId: seoResult.data.id });
      if (result.status !== "ok") {
        return { success: false, code: "not_found", message: "Article not found." };
      }
      return { success: true, data: result.data };
    });
  },
};
