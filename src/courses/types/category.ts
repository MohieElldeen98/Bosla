import type { LocalizedText } from "@/types/i18n";

/** Mirrors `db/schema/course.ts`'s `categories` table. `specialtyId` is
 *  nullable — a category can be scoped to one specialty or cross-cutting. */
export interface Category {
  id: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText | null;
  icon: string | null;
  specialtyId: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** The locale-resolved view — bilingual fields flattened to one string. */
export interface ResolvedCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  specialtyId: string | null;
  isActive: boolean;
  displayOrder: number;
}

export interface NewCategoryInput {
  slug: string;
  name: LocalizedText;
  description?: LocalizedText | null;
  icon?: string | null;
  specialtyId?: string | null;
  isActive?: boolean;
  displayOrder?: number;
}
