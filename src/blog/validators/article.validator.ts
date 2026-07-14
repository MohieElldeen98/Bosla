import { z } from "zod";
import { routing } from "@/i18n/routing";
import { localizedTextSchema } from "@/cms/validators/content-blocks.validator";
import { slugSchema } from "@/blog/validators/shared";
import { ARTICLE_STATUSES } from "@/blog/types/article-status";
import { ARTICLE_SORT_FIELDS, SORT_DIRECTIONS } from "@/blog/types/article-search";

/**
 * `status` is deliberately absent from both schemas — an article's status
 * only changes through `ArticleService.publish`/`unpublish` (dedicated
 * transitions, audited as such), never through the editor's save, the same
 * separation `UpdateCourseInput` enforces for the course state machine.
 * `authorId`/`readTimeMinutes`/`viewCount` are service-owned too: author
 * defaults to the acting admin, read time is derived from the body, and
 * view count is only ever incremented by the public page.
 */
const articleBaseFields = z.object({
  slug: slugSchema,
  title: localizedTextSchema,
  /** `.nullable()` like the Course Editor's `subtitle` — the form always
   *  submits the whole form, so a cleared excerpt arrives as an explicit
   *  `null` ("clear it"), never `undefined` ("leave unchanged"). */
  excerpt: localizedTextSchema.nullable().optional(),
  /** HTML per locale (the Tiptap editor's output) — sanitized at the
   *  Service layer before every write, so no format validation here
   *  beyond "a string per locale". */
  body: localizedTextSchema,
  coverImageId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  isFeatured: z.boolean(),
});

export const createArticleSchema = articleBaseFields.extend({
  isFeatured: z.boolean().default(false),
});
export type CreateArticleInput = z.infer<typeof createArticleSchema>;

export const updateArticleSchema = articleBaseFields.partial();
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;

/** A `LocalizedText` shape whose locales may be blank — the Article
 *  Editor's *client-side* stand-in for the optional `excerpt`: the form
 *  always renders both locale inputs, so "no excerpt" is "both blank",
 *  which the form normalizes to the explicit `null` the server schema
 *  expects before submitting (see `ArticleEditorForm.onSubmit`). */
const blankableLocalizedTextSchema = z.object(
  Object.fromEntries(routing.locales.map((locale) => [locale, z.string()])) as Record<
    (typeof routing.locales)[number],
    z.ZodString
  >,
);

/** The Article Editor's own client-side resolver schema — same
 *  relationship to `createArticleSchema` as `courseFormSchema` has to
 *  `createCourseSchema` (see that file's comment on the input/output type
 *  split `zodResolver` can't reconcile). `body` reuses
 *  `localizedTextSchema` deliberately: an "empty" Tiptap document still
 *  emits `<p></p>`, so it never spuriously fails `min(1)` while drafting,
 *  but a tampered truly-empty string does. */
export const articleFormSchema = z.object({
  slug: slugSchema,
  title: localizedTextSchema,
  excerpt: blankableLocalizedTextSchema,
  body: localizedTextSchema,
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
