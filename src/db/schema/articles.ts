import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "./auth-users";
import { cmsMediaAssets, cmsSeoMeta } from "./cms";
import { profiles } from "./profiles";

/**
 * The Blog domain — the `articles` entity docs/database-overview.md §5 had
 * planned: long-form editorial content for SEO/thought-leadership,
 * independent of paid courses (docs/product-blueprint.md §3 "Article").
 * Follows `db/schema/course.ts`'s conventions exactly: translatable fields
 * are `{"en": ..., "ar": ...}` jsonb, FKs use `restrict`/`set null` (never
 * `cascade` except audit logs), and no Drizzle `relations()` — joins are
 * parallel queries composed at the Service layer.
 */

/** Mirrors `blog/types/article-status.ts`'s `ARTICLE_STATUSES` tuple
 *  exactly. Two states only — no `in_review`/`archived` like courses;
 *  articles are Admin-authored, so there is no submission workflow. */
export const articleStatusEnum = pgEnum("article_status", ["draft", "published"]);

/**
 * The language the article is actually *written in* — mirrors
 * `blog/types/article-language.ts`'s `ARTICLE_LANGUAGES` tuple. Articles
 * are single-language by design (an author writes once, not a translation
 * pair — see `articles.title`'s doc comment); this drives text direction
 * on the public pages. Arabic-first default, matching Bosla's audience.
 */
export const articleLanguageEnum = pgEnum("article_language", ["en", "ar"]);

/**
 * The blog's own editorial taxonomy ("Rehabilitation", "Nutrition Myths",
 * ...) — deliberately NOT the course catalog's `categories` table: blog
 * topics are marketing/editorial groupings that need to evolve freely
 * (seasonal topics, campaign tags) without constraining, or being
 * constrained by, catalog browsing. Same shape as `categories` minus the
 * specialty scoping.
 */
export const articleCategories = pgTable(
  "article_categories",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: text("slug").notNull(),
    name: jsonb("name").notNull(),
    description: jsonb("description"),
    /** Icon *key* resolved through a lookup map at render time — the same
     *  "name, not component" convention as `specialties.icon`. */
    icon: text("icon"),
    isActive: boolean("is_active").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    uniqueIndex("article_categories_slug_key").on(table.slug),
    index("article_categories_is_active_idx").on(table.isActive),
  ],
);

export const articleSeries = pgTable(
  "article_series",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: text("slug").notNull(),
    title: jsonb("title").notNull(),
    description: jsonb("description"),
    isActive: boolean("is_active").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    uniqueIndex("article_series_slug_key").on(table.slug),
    index("article_series_is_active_idx").on(table.isActive),
  ],
);

/**
 * One blog post. `body` is translatable *HTML* (produced by the admin
 * Tiptap editor, sanitized at the Service layer before every write, and
 * rendered server-side on the public page) — not markdown, unlike the CMS
 * `LocalizedRichText` marker, because a WYSIWYG editor's native output is
 * HTML and a markdown round-trip would be lossy.
 *
 * `read_time_minutes` and `view_count` ARE stored columns, unlike the
 * course aggregates deliberately left out of `courses`: read time is
 * derived from the article's own body (recomputed by the Service on every
 * body write, never manually set), and view count is a simple increment on
 * public reads that powers the listing page's "Most popular" rail — neither
 * depends on other tables existing first.
 */
export const articles = pgTable(
  "articles",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: text("slug").notNull(),
    title: jsonb("title").notNull(),
    /** Short teaser shown on listing cards and used as the SEO description
     *  fallback — kept separate from `body` so cards never truncate HTML. */
    excerpt: jsonb("excerpt"),
    body: jsonb("body").notNull(),
    /** Structured sources stay separate from body HTML so editors can add,
     * remove, and renumber them without parsing rich text. */
    references: jsonb("references").notNull().default(sql`'[]'::jsonb`),
    coverImageId: uuid("cover_image_id").references(() => cmsMediaAssets.id, {
      onDelete: "set null",
    }),
    /** The signed-in account that authored the post (docs plan: `author_id`
     *  → `profiles`) — nullable + `set null` so an article survives its
     *  author's account being deleted; the public page falls back to the
     *  site name for attribution. */
    authorId: uuid("author_id").references(() => profiles.id, { onDelete: "set null" }),
    categoryId: uuid("category_id").references(() => articleCategories.id, {
      onDelete: "set null",
    }),
    seriesId: uuid("series_id").references(() => articleSeries.id, { onDelete: "set null" }),
    seriesPosition: integer("series_position"),
    /** See `articleLanguageEnum`. The translatable jsonb fields
     *  (`title`/`excerpt`/`body`) still hold both locale keys for
     *  compatibility with every `LocalizedText` read path — the Service
     *  mirrors the single written text into both — so this column, not
     *  the jsonb shape, is the source of truth for the article's real
     *  language and rendering direction. */
    language: articleLanguageEnum("language").notNull().default("ar"),
    status: articleStatusEnum("status").notNull().default("draft"),
    /** Set on first publish only, so re-publishing after an unpublish
     *  doesn't rewrite history; `null` means never published. */
    publishedAt: timestamp("published_at", { withTimezone: true }),
    readTimeMinutes: integer("read_time_minutes").notNull().default(1),
    viewCount: integer("view_count").notNull().default(0),
    /** Manual curation flag for the listing page's carousel — lets an Admin
     *  pin a post regardless of `view_count`. */
    isFeatured: boolean("is_featured").notNull().default(false),
    /** Nullable defensively, same reasoning as `courses.seo_meta_id`. */
    seoMetaId: uuid("seo_meta_id").references(() => cmsSeoMeta.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    uniqueIndex("articles_slug_key").on(table.slug),
    index("articles_status_idx").on(table.status),
    index("articles_category_id_idx").on(table.categoryId),
    index("articles_series_position_idx").on(table.seriesId, table.seriesPosition),
    index("articles_author_id_idx").on(table.authorId),
    /** The two listing-page orderings: latest and most popular — both
     *  always filtered to `status = 'published'` first. */
    index("articles_status_published_at_idx").on(table.status, table.publishedAt),
    index("articles_status_view_count_idx").on(table.status, table.viewCount),
    check("articles_read_time_minutes_check", sql`${table.readTimeMinutes} >= 0`),
    check("articles_view_count_check", sql`${table.viewCount} >= 0`),
  ],
);

/**
 * Write-only audit trail for article mutations, mirroring
 * `course_audit_logs`'s exact shape/rationale — its own table, not a shared
 * cross-domain one, per the established convention.
 */
export const articleAuditLogs = pgTable(
  "article_audit_logs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    action: text("action").notNull(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    metadata: jsonb("metadata").notNull().default({}),
  },
  (table) => [
    index("article_audit_logs_article_id_idx").on(table.articleId, table.createdAt),
    index("article_audit_logs_actor_id_idx").on(table.actorId, table.createdAt),
    index("article_audit_logs_created_at_idx").on(table.createdAt),
  ],
);
