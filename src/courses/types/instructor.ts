import type { LocalizedText } from "@/types/i18n";

/**
 * Mirrors `db/schema/course.ts`'s `instructors` table — course
 * attribution/content data, not a platform user account. See that table's
 * doc comment for how this relates to (and deliberately doesn't touch) the
 * still-planned `instructor_profiles` and the existing mock-backed
 * `InstructorSlide` (`src/types/instructor.ts`).
 */
export interface Instructor {
  id: string;
  slug: string;
  name: LocalizedText;
  title: LocalizedText | null;
  qualification: LocalizedText | null;
  bio: LocalizedText | null;
  specialtyId: string | null;
  experienceYears: number | null;
  avatarImageId: string | null;
  publicPortraitImageId: string | null;
  profileId: string | null;
  isFeatured: boolean;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** The locale-resolved view — bilingual fields flattened to one string. */
export interface ResolvedInstructor {
  id: string;
  slug: string;
  name: string;
  title: string | null;
  qualification: string | null;
  bio: string | null;
  specialtyId: string | null;
  experienceYears: number | null;
  avatarImageId: string | null;
  publicPortraitImageId: string | null;
  profileId: string | null;
  isFeatured: boolean;
  isActive: boolean;
  displayOrder: number;
}

export interface NewInstructorInput {
  slug: string;
  name: LocalizedText;
  title?: LocalizedText | null;
  qualification?: LocalizedText | null;
  bio?: LocalizedText | null;
  specialtyId?: string | null;
  experienceYears?: number | null;
  avatarImageId?: string | null;
  publicPortraitImageId?: string | null;
  profileId?: string | null;
  isFeatured?: boolean;
  isActive?: boolean;
  displayOrder?: number;
}
