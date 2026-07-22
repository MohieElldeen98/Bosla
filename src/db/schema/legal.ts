import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "./auth-users";

/**
 * The Static Content / Legal Document CMS (docs/legal-content-platform.md)
 * — Privacy Policy, Terms of Use, Refund Policy, and any future legal
 * page, all database-backed, never hardcoded in a component. One row per
 * document (`slug` is the stable identity — "privacy" | "terms" |
 * "refunds" today, kept as plain `text` rather than a Postgres enum so a
 * new legal page is a new row, never a migration, the same "no schema
 * change for a new value" reasoning `payments.provider` follows).
 *
 * Deliberately its OWN table rather than reusing `cms_pages` +
 * `cms_sections`: that stack is a typed section-builder for the homepage
 * (docs/cms-overview.md §1 — "a fixed type registry, not a page builder"),
 * while a legal document is exactly one long-form rich-text body per
 * locale. Versioning here is
 * deliberately simpler than the homepage's own version-row-per-publish
 * history: `version` is a single incrementing integer bumped on
 * publish, and the row IS the current draft/published state — a full
 * version-history table is a documented future extension
 * (docs/legal-content-platform.md §Future), not a requirement today (the
 * spec asks for "version number" and "last updated date" surfaced in the
 * admin UI, not a diff/rollback UI).
 *
 * `content_en`/`content_ar` hold sanitized HTML from the shared
 * `RichTextEditor` (`sanitize-legal-html.ts` is the write-time security
 * boundary, mirroring `sanitize-article-html.ts`). `published`
 * distinguishes a draft-in-progress from what the public pages render —
 * `LegalDocumentService.getPublishedBySlug` only ever reads a
 * `published: true` row, so an admin can edit safely without the public
 * page ever showing half-finished copy.
 */
export const legalDocuments = pgTable(
  "legal_documents",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: text("slug").notNull(),
    titleEn: text("title_en").notNull(),
    titleAr: text("title_ar").notNull(),
    contentEn: text("content_en").notNull(),
    contentAr: text("content_ar").notNull(),
    version: integer("version").notNull().default(1),
    published: boolean("published").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    updatedByUserId: uuid("updated_by_user_id").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    uniqueIndex("legal_documents_slug_key").on(table.slug),
    index("legal_documents_published_idx").on(table.published),
    check("legal_documents_version_check", sql`${table.version} > 0`),
  ],
);

/** Immutable snapshot of a published legal document. Unlike
 * `legalDocumentAcceptances`, this is an append-only audit history: one row
 * records the exact bilingual content published for each version. */
export const legalDocumentVersions = pgTable(
  "legal_document_versions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    documentId: uuid("document_id")
      .notNull()
      .references(() => legalDocuments.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    titleEn: text("title_en").notNull(),
    titleAr: text("title_ar").notNull(),
    contentEn: text("content_en").notNull(),
    contentAr: text("content_ar").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    publishedByUserId: uuid("published_by_user_id").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    uniqueIndex("legal_document_versions_document_version_key").on(table.documentId, table.version),
    index("legal_document_versions_document_id_idx").on(table.documentId),
    check("legal_document_versions_version_check", sql`${table.version} > 0`),
  ],
);

/** The current acceptance state for each signed-in user and legal document.
 * This is intentionally one upserted row per `(user, slug)`, not a history
 * log; document version history is a separate concern.
 *
 * `acceptedDocumentVersionId` is the authoritative audit link, added
 * alongside (not replacing) `slug`/`acceptedVersion` — it points at the
 * exact immutable `legal_document_versions` row the user accepted, so
 * "which version did this user actually see" is answerable by an id
 * join, never by re-deriving it from a version *number* that could in
 * principle mean different content across a restore/republish cycle.
 * `onDelete: "restrict"` is deliberate, not `"cascade"`/`"set null"`: it
 * makes it impossible at the database level to ever delete a version
 * snapshot that an acceptance still references — on top of the fact
 * that no delete method exists on `legalDocumentVersions` in the first
 * place, this is the hard guarantee. Nullable because existing rows
 * (from before this column existed) need a backfill pass first; every
 * NEW acceptance always sets it (see `LegalAcceptanceService.
 * acceptCurrentVersions`) — a `null` here is only ever "not yet
 * backfilled", and `LegalAcceptanceService.getAcceptanceStatus` treats
 * it exactly like "never accepted". */
export const legalDocumentAcceptances = pgTable(
  "legal_document_acceptances",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    acceptedVersion: integer("accepted_version").notNull(),
    acceptedDocumentVersionId: uuid("accepted_document_version_id").references(() => legalDocumentVersions.id, {
      onDelete: "restrict",
    }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    uniqueIndex("legal_document_acceptances_user_slug_key").on(table.userId, table.slug),
    index("legal_document_acceptances_user_id_idx").on(table.userId),
    index("legal_document_acceptances_version_id_idx").on(table.acceptedDocumentVersionId),
    check("legal_document_acceptances_version_check", sql`${table.acceptedVersion} > 0`),
  ],
);
