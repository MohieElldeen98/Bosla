import type { LocalizedText } from "@/types/i18n";
import type { CourseLanguage } from "@/courses/types/course-language";
import type { CourseLevel } from "@/courses/types/course-level";
import type { CourseStatus } from "@/courses/types/course-status";

/**
 * Mirrors `db/schema/course.ts`'s `courses` table. `price`/`originalPrice`
 * are `string`, not `number` — Postgres `numeric` round-trips through
 * Drizzle as a string to avoid floating-point precision loss on money,
 * same reasoning Commerce (a later phase) will need for exact totals.
 */
export interface Course {
  id: string;
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  specialtyId: string;
  categoryId: string | null;
  instructorId: string;
  level: CourseLevel;
  status: CourseStatus;
  language: CourseLanguage;
  price: string;
  originalPrice: string | null;
  currency: string;
  coverImageId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The locale-resolved view — bilingual fields flattened to one string. */
export interface ResolvedCourse {
  id: string;
  slug: string;
  title: string;
  description: string;
  specialtyId: string;
  categoryId: string | null;
  instructorId: string;
  level: CourseLevel;
  status: CourseStatus;
  language: CourseLanguage;
  price: string;
  originalPrice: string | null;
  currency: string;
  coverImageId: string | null;
}

export interface NewCourseInput {
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  specialtyId: string;
  categoryId?: string | null;
  instructorId: string;
  level?: CourseLevel;
  status?: CourseStatus;
  language?: CourseLanguage;
  price: string;
  originalPrice?: string | null;
  currency?: string;
  coverImageId?: string | null;
}
