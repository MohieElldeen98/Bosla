import type { LocalizedText } from "@/types/i18n";
import type { ArticleStatus } from "@/blog/types/article-status";

/**
 * Mirrors `db/schema/articles.ts`'s `articles` table. `body` holds
 * sanitized HTML per locale (the Tiptap editor's output — see the schema
 * doc comment for why HTML, not markdown). Dates are ISO strings, matching
 * every other domain type — `ArticleRepository` converts at the boundary.
 */
export interface Article {
  id: string;
  slug: string;
  title: LocalizedText;
  excerpt: LocalizedText | null;
  body: LocalizedText;
  coverImageId: string | null;
  authorId: string | null;
  categoryId: string | null;
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
  coverImageId?: string | null;
  authorId?: string | null;
  categoryId?: string | null;
  status?: ArticleStatus;
  readTimeMinutes?: number;
  isFeatured?: boolean;
  seoMetaId?: string | null;
}
