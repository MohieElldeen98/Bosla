import { z } from "zod";
import { slugSchema } from "@/blog/validators/shared";
import { ARTICLE_LANGUAGES } from "@/blog/types/article-language";
import { ARTICLE_STATUSES } from "@/blog/types/article-status";
import { ARTICLE_SORT_FIELDS, SORT_DIRECTIONS } from "@/blog/types/article-search";

const articleReferenceSchema = z.object({
  title: z.string().trim().min(1).max(300),
  url: z.string().trim().url().max(2048),
});

/**
 * Articles are authored in ONE language (`language` says which — see
 * `db/schema/articles.ts`'s `article_language` doc comment), so unlike
 * every CMS/course schema, `title`/`excerpt`/`body` here are plain
 * strings, not `LocalizedText` pairs — requiring an author to write every
 * article twice was rejected as a product decision. `ArticleService`
 * mirrors the single text into both locale keys at write time, keeping
 * the stored shape compatible with every `LocalizedText` read path.
 *
 * `status` is deliberately absent — an article's status only changes
 * through `ArticleService.publish`/`unpublish` (dedicated, audited
 * transitions), never through the editor's save. `authorId`/
 * `readTimeMinutes`/`viewCount` are service-owned too. So is `slug`:
 * generated once from the title at create time (`generateUniqueSlug` —
 * collision-proof, never author-chosen) and immutable afterward, so
 * published links can't break or be hijacked through the editor.
 */
const articleBaseFields = z.object({
  language: z.enum(ARTICLE_LANGUAGES),
  title: z.string().trim().min(1),
  /** `.nullable()` — the form always submits the whole form, so a cleared
   *  excerpt arrives as an explicit `null` ("clear it"). */
  excerpt: z.string().trim().min(1).nullable().optional(),
  /** HTML (the Tiptap editor's output) — sanitized at the Service layer
   *  before every write. An "empty" Tiptap document still emits
   *  `<p></p>`, so `min(1)` never spuriously fails while drafting. */
  body: z.string().min(1),
  references: z.array(articleReferenceSchema).max(100).optional(),
  coverImageId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  isFeatured: z.boolean(),
});

export const createArticleSchema = articleBaseFields.extend({
  references: z.array(articleReferenceSchema).max(100).default([]),
  isFeatured: z.boolean().default(false),
  /** Create-and-publish in one step — the editor's primary action.
   *  Creation-time status choice mirrors `createCourseSchema`'s precedent
   *  ("initial status is freely choosable at creation time"); later
   *  transitions still go through `publish`/`unpublish` only. */
  publish: z.boolean().default(false),
});
export type CreateArticleInput = z.infer<typeof createArticleSchema>;

export const updateArticleSchema = articleBaseFields.partial();
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;

/** The Article Editor's own client-side resolver schema — same
 *  relationship to `createArticleSchema` as `courseFormSchema` has to
 *  `createCourseSchema`. `excerpt` stays a blankable plain string here
 *  (the form always renders the input); `toSubmitPayload` normalizes
 *  blank to the explicit `null` the server schema expects. */
export const articleFormSchema = z.object({
  language: z.enum(ARTICLE_LANGUAGES),
  title: z.string().trim().min(1),
  excerpt: z.string(),
  body: z.string().min(1),
  references: z.array(articleReferenceSchema).max(100),
  coverImageId: z.string().uuid().nullable(),
  categoryId: z.string().uuid().nullable(),
  isFeatured: z.boolean(),
});
export type ArticleFormValues = z.infer<typeof articleFormSchema>;

/** Parses `/admin/articles`'s URL search params — malformed values
 *  degrade to defaults, never a crash (mirrors `searchCoursesSchema`). */
export const searchArticlesSchema = z.object({
  query: z.string().trim().min(1).optional(),
  status: z.enum(ARTICLE_STATUSES).optional(),
  categoryId: z.string().uuid().optional(),
  sortBy: z.enum(ARTICLE_SORT_FIELDS).optional(),
  sortDirection: z.enum(SORT_DIRECTIONS).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
export type SearchArticlesInput = z.infer<typeof searchArticlesSchema>;

/**
 * Parses the public blog's URL search params. Deliberately has **no
 * `status` field** — the page always passes `status: "published",
 * onlyActive: true` itself, hard-coded, never from user input (the same
 * guarantee `publicSearchCoursesSchema` makes). `category` is a slug, not
 * an id — public URLs stay readable (`/blog?category=rehabilitation`).
 */
export const publicSearchArticlesSchema = z.object({
  query: z.string().trim().min(1).optional(),
  category: slugSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
});
export type PublicSearchArticlesInput = z.infer<typeof publicSearchArticlesSchema>;
