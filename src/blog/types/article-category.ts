import type { LocalizedText } from "@/types/i18n";

/** Mirrors `db/schema/articles.ts`'s `article_categories` table — the
 *  blog's own editorial taxonomy, deliberately separate from the course
 *  catalog's `categories` (see the schema doc comment). */
export interface ArticleCategory {
  id: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText | null;
  icon: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** The locale-resolved view — bilingual fields flattened to one string. */
export interface ResolvedArticleCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  displayOrder: number;
}

export interface NewArticleCategoryInput {
  slug: string;
  name: LocalizedText;
  description?: LocalizedText | null;
  icon?: string | null;
  isActive?: boolean;
  displayOrder?: number;
}
