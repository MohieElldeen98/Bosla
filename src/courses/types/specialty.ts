import type { LocalizedText } from "@/types/i18n";

/** Mirrors `db/schema/course.ts`'s `specialties` table. */
export interface Specialty {
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
export interface ResolvedSpecialty {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  displayOrder: number;
}

export interface NewSpecialtyInput {
  slug: string;
  name: LocalizedText;
  description?: LocalizedText | null;
  icon?: string | null;
  isActive?: boolean;
  displayOrder?: number;
}
