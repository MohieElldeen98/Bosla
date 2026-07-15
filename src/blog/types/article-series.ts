import type { LocalizedText } from "@/types/i18n";

export interface ArticleSeries {
  id: string;
  slug: string;
  title: LocalizedText;
  description: LocalizedText | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResolvedArticleSeries {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
}

export interface NewArticleSeriesInput {
  slug: string;
  title: LocalizedText;
  description?: LocalizedText | null;
  isActive?: boolean;
  displayOrder?: number;
}
