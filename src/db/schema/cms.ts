import { sql } from "drizzle-orm";
import {
  boolean,
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

/**
 * The fixed section-type registry (docs/cms-overview.md §1) — a genuinely
 * new section type is an engineering task (add here, add a Zod content
 * schema in `src/cms/validators/section-content.schemas.ts`, build the
 * component), never a CMS configuration task. Mirrors
 * `src/cms/types/section.ts`'s `CMS_SECTION_TYPES` exactly.
 */
export const cmsSectionTypeEnum = pgEnum("cms_section_type", [
  "hero",
  "featured_instructors",
  "featured_courses",
  "categories",
  "why_bosla",
  "learning_experience",
  "testimonials",
  "faq",
  "statistics",
  "cta",
]);

/** Mirrors `src/cms/types/navigation.ts`'s `NAVIGATION_LOCATIONS` exactly. */
export const cmsNavigationLocationEnum = pgEnum("cms_navigation_location", [
  "header",
  "footer_product",
  "footer_company",
  "footer_resources",
]);

/**
 * One uploaded asset, reusable across sections/SEO/navigation. Mirrors
 * `src/types/media.ts`'s `MediaAsset` shape exactly — that type is reused
 * as-is for CMS media (see `src/cms/types/media.ts`) rather than duplicated.
 */
export const cmsMediaAssets = pgTable("cms_media_assets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull(),
  alt: jsonb("alt").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  placeholder: text("placeholder"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

/**
 * Reusable SEO fields, attachable to any content type with its own public
 * URL — today just `cms_pages`, later courses/articles/landing pages
 * (docs/cms-overview.md §7).
 */
export const cmsSeoMeta = pgTable("cms_seo_meta", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: jsonb("title"),
  description: jsonb("description"),
  ogImageId: uuid("og_image_id").references(() => cmsMediaAssets.id, { onDelete: "set null" }),
  canonicalPath: text("canonical_path"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});

/**
 * A manageable page — the homepage (`slug: "home"`) today, landing pages
 * later, reusing the exact same section-block model (docs/cms-overview.md
 * §11) rather than a separate schema per page type.
 */
export const cmsPages = pgTable("cms_pages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  seoMetaId: uuid("seo_meta_id").references(() => cmsSeoMeta.id, { onDelete: "set null" }),
  /** Set whenever `CmsPageVersionService.publish` succeeds — `null` means
   *  this page has never been published (draft-only). A fast "is there a
   *  live version" / "when was it last published" check without joining
   *  `cms_page_versions`; the version row itself (§ below) is still the
   *  source of truth for the actual published content. */
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
}, (table) => [uniqueIndex("cms_pages_slug_key").on(table.slug)]);

/**
 * One ordered, toggleable block within a page. `content` is validated
 * against the Zod schema registered for `section_type`
 * (`src/cms/validators/section-content.schemas.ts`) at the service layer —
 * the database itself stays generic (docs/cms-overview.md §1: fixed type
 * registry, not a page builder).
 */
export const cmsSections = pgTable(
  "cms_sections",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    pageId: uuid("page_id")
      .notNull()
      .references(() => cmsPages.id, { onDelete: "cascade" }),
    sectionType: cmsSectionTypeEnum("section_type").notNull(),
    isEnabled: boolean("is_enabled").notNull().default(true),
    position: integer("position").notNull().default(0),
    content: jsonb("content").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    index("cms_sections_page_position_idx").on(table.pageId, table.position),
    index("cms_sections_type_idx").on(table.sectionType),
  ],
);

/**
 * An immutable, append-only published snapshot of a page (Step 6.5 —
 * docs/cms-overview.md §15). `cms_pages`/`cms_sections`/`cms_seo_meta`
 * ("draft" throughout this table's own comments) stay the single mutable
 * working copy the Admin Panel edits, exactly as built in Steps 6.1-6.4;
 * this table is never written by a section/SEO edit, only by
 * `CmsPageVersionService.publish`, which serializes the draft's current
 * state into `snapshot` at that moment. The public homepage reads the
 * highest-`version` row for a page — never `cms_sections` directly — so a
 * draft edit is invisible to visitors until the next publish.
 *
 * `created_at`/`created_by` and `published_at`/`published_by` are
 * deliberately separate columns, even though `publish` sets all four to
 * the same instant today (this step doesn't build scheduling/review
 * workflows — see docs/cms-overview.md §15's scope notes) — a future
 * "create now, publish later" flow is additive on top of this shape, not a
 * migration.
 */
export const cmsPageVersions = pgTable(
  "cms_page_versions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    pageId: uuid("page_id")
      .notNull()
      .references(() => cmsPages.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    // Nullable, not `.notNull()`: `onDelete: "set null"` requires it — an
    // audit trail entry must survive the referenced account being deleted
    // later, even though every real insert path (`requireCmsAccess`)
    // guarantees a real user at write time.
    createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().default(sql`now()`),
    publishedBy: uuid("published_by").references(() => authUsers.id, { onDelete: "set null" }),
  },
  (table) => [
    uniqueIndex("cms_page_versions_page_version_key").on(table.pageId, table.version),
    index("cms_page_versions_page_id_idx").on(table.pageId, table.version),
  ],
);

/**
 * Append-only audit trail for homepage CMS actions (Step 6.6 —
 * docs/cms-overview.md §16). Written by `CmsSectionService`/`CmsSeoService`
 * (save/toggle/reorder) and `CmsPageVersionService` (publish/revert) right
 * after each successful mutation — never updated or deleted. `section_id`
 * is nullable because publish/revert/reorder are page-level, not
 * section-level. No read/query method exists yet ("no Audit Log UI" is
 * explicit Step 6.6 scope); this is write-only infrastructure for a future
 * step's viewer.
 */
export const cmsAuditLogs = pgTable(
  "cms_audit_logs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    action: text("action").notNull(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => cmsPages.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id").references(() => cmsSections.id, { onDelete: "set null" }),
    actorId: uuid("actor_id").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    metadata: jsonb("metadata").notNull().default({}),
  },
  (table) => [index("cms_audit_logs_page_id_idx").on(table.pageId, table.createdAt)],
);

/**
 * Header nav links and the three footer link columns
 * (docs/cms-overview.md §8). The language switcher and Sign In/Get Started
 * buttons are deliberately NOT rows here — structural product chrome, not
 * marketing content.
 */
export const cmsNavigationItems = pgTable(
  "cms_navigation_items",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    location: cmsNavigationLocationEnum("location").notNull(),
    label: jsonb("label").notNull(),
    href: text("href").notNull(),
    icon: text("icon"),
    position: integer("position").notNull().default(0),
    isEnabled: boolean("is_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [index("cms_navigation_items_location_position_idx").on(table.location, table.position)],
);

/**
 * Generic sitewide key-value config — footer content (tagline, social
 * links, newsletter copy — docs/cms-overview.md §9), sitewide SEO defaults
 * (§7), and future settings (default currency, feature flags —
 * docs/database-overview.md), all without a schema migration per new
 * setting. `src/cms/types/site-settings.ts` types the known keys.
 */
export const cmsSiteSettings = pgTable("cms_site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
});
