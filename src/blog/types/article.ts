import type { LocalizedText } from "@/types/i18n";
import type { ArticleLanguage } from "@/blog/types/article-language";
import type { ArticleStatus } from "@/blog/types/article-status";

export interface ArticleReference {
  title: string;
  url: string;
}

/**
 * Mirrors `db/schema/articles.ts`'s `articles` table. `body` holds
 * sanitized HTML per locale (the Tiptap editor's output — see the schema
 * doc comment for why HTML, not markdown); since authoring is
 * single-language, both locale keys hold the same mirrored text and
 * `language` says which one it really is. Dates are ISO strings, matching
 * every other domain type — `ArticleRepository` converts at the boundary.
 */
export interface Article {
  id: string;
  slug: string;
  title: LocalizedText;
  excerpt: LocalizedText | null;
  body: LocalizedText;
  references: ArticleReference[];
  coverImageId: string | null;
  authorId: string | null;
  categoryId: string | null;
  seriesId: string | null;
  seriesPosition: number | null;
  language: ArticleLanguage;
  status: ArticleStatus;
  publishedAt: string | null;
  readTimeMinutes: number;
  viewCount: number;
  isFeatured: boolean;
  seoMetaId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewArticleInput {
  slug: string;
  title: LocalizedText;
  excerpt?: LocalizedText | null;
  body: LocalizedText;
  references?: ArticleReference[];
  coverImageId?: string | null;
  authorId?: string | null;
  categoryId?: string | null;
  seriesId?: string | null;
  seriesPosition?: number | null;
  language?: ArticleLanguage;
  status?: ArticleStatus;
  publishedAt?: Date | null;
  readTimeMinutes?: number;
  isFeatured?: boolean;
  seoMetaId?: string | null;
}
