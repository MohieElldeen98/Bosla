import type { LocalizedText } from "@/types/i18n";
import type { CourseLanguage } from "@/courses/types/course-language";
import type { CourseLevel } from "@/courses/types/course-level";
import type { CourseStatus } from "@/courses/types/course-status";

/**
 * Mirrors `db/schema/course.ts`'s `courses` table. `price`/`originalPrice`
 * are `string`, not `number` — Postgres `numeric` round-trips through
 * Drizzle as a string to avoid floating-point precision loss on money,
 * same reasoning Commerce (a later phase) will need for exact totals.
 * `requirements`/`learningObjectives`/`targetAudience` are arrays of
 * `LocalizedText` (not a single localized array-of-strings blob), so each
 * bullet point can be reordered/removed independently in the Course Editor
 * (Step 3.3) and rendered as its own list item later.
 */
export interface Course {
  id: string;
  slug: string;
  title: LocalizedText;
  subtitle: LocalizedText | null;
  description: LocalizedText;
  shortDescription: LocalizedText | null;
  specialtyId: string;
  categoryId: string | null;
  instructorId: string;
  level: CourseLevel;
  status: CourseStatus;
  language: CourseLanguage;
  price: string;
  originalPrice: string | null;
  saleEndsAt: string | null;
  currency: string;
  isFree: boolean;
  estimatedDurationMinutes: number | null;
  certificateAvailable: boolean;
  featured: boolean;
  requirements: LocalizedText[];
  learningObjectives: LocalizedText[];
  targetAudience: LocalizedText[];
  coverImageId: string | null;
  thumbnailId: string | null;
  trailerVideoId: string | null;
  seoMetaId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The locale-resolved view — bilingual fields flattened to one string
 *  (and localized arrays flattened to plain string arrays). */
export interface ResolvedCourse {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  shortDescription: string | null;
  specialtyId: string;
  categoryId: string | null;
  instructorId: string;
  level: CourseLevel;
  status: CourseStatus;
  language: CourseLanguage;
  price: string;
  originalPrice: string | null;
  currency: string;
  isFree: boolean;
  estimatedDurationMinutes: number | null;
  certificateAvailable: boolean;
  featured: boolean;
  requirements: string[];
  learningObjectives: string[];
  targetAudience: string[];
  coverImageId: string | null;
  thumbnailId: string | null;
  trailerVideoId: string | null;
}

export interface NewCourseInput {
  slug: string;
  title: LocalizedText;
  subtitle?: LocalizedText | null;
  description: LocalizedText;
  shortDescription?: LocalizedText | null;
  specialtyId: string;
  categoryId?: string | null;
  instructorId: string;
  level?: CourseLevel;
  status?: CourseStatus;
  language?: CourseLanguage;
  price: string;
  originalPrice?: string | null;
  saleEndsAt?: string | null;
  currency?: string;
  isFree?: boolean;
  estimatedDurationMinutes?: number | null;
  certificateAvailable?: boolean;
  featured?: boolean;
  requirements?: LocalizedText[];
  learningObjectives?: LocalizedText[];
  targetAudience?: LocalizedText[];
  coverImageId?: string | null;
  thumbnailId?: string | null;
  trailerVideoId?: string | null;
  seoMetaId?: string | null;
}
