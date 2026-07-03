import type { LocalizedText } from "@/types/i18n";
import type { LessonType } from "@/learning/types/lesson-type";

/** Mirrors `db/schema/learning.ts`'s `lessons` table. */
export interface Lesson {
  id: string;
  moduleId: string;
  title: LocalizedText;
  position: number;
  type: LessonType;
  videoAssetId: string | null;
  body: LocalizedText | null;
  durationSeconds: number | null;
  isPreview: boolean;
  createdAt: string;
  updatedAt: string;
}

/** The locale-resolved view — bilingual fields flattened to one string. */
export interface ResolvedLesson {
  id: string;
  moduleId: string;
  title: string;
  position: number;
  type: LessonType;
  videoAssetId: string | null;
  body: string | null;
  durationSeconds: number | null;
  isPreview: boolean;
}

export interface NewLessonInput {
  moduleId: string;
  title: LocalizedText;
  position?: number;
  type?: LessonType;
  videoAssetId?: string | null;
  body?: LocalizedText | null;
  durationSeconds?: number | null;
  isPreview?: boolean;
}
