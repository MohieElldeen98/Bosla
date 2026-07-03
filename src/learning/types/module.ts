import type { LocalizedText } from "@/types/i18n";

/** Mirrors `db/schema/learning.ts`'s `modules` table. */
export interface Module {
  id: string;
  courseId: string;
  title: LocalizedText;
  position: number;
  createdAt: string;
  updatedAt: string;
}

/** The locale-resolved view — bilingual fields flattened to one string. */
export interface ResolvedModule {
  id: string;
  courseId: string;
  title: string;
  position: number;
}

export interface NewModuleInput {
  courseId: string;
  title: LocalizedText;
  position?: number;
}
