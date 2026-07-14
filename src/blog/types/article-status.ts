/** Mirrors `db/schema/articles.ts`'s `article_status` enum exactly — same
 *  "tuple here, enum mirrors it" convention as
 *  `courses/types/course-status.ts`. Two states only: articles are
 *  Admin-authored (docs/roadmap.md Phase 7), so there is no
 *  `in_review`/`archived` workflow like courses have. */
export const ARTICLE_STATUSES = ["draft", "published"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];
