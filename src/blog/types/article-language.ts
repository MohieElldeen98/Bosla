/** Mirrors `db/schema/articles.ts`'s `article_language` enum — the
 *  language an article is written in (articles are single-language; see
 *  the schema doc comment). Drives text direction on the public pages. */
export const ARTICLE_LANGUAGES = ["en", "ar"] as const;
export type ArticleLanguage = (typeof ARTICLE_LANGUAGES)[number];

export function articleDirection(language: ArticleLanguage): "ltr" | "rtl" {
  return language === "ar" ? "rtl" : "ltr";
}
