import type { LocalizedText } from "@/types/i18n";
import type { ResolvedMediaAsset } from "@/types/media";

/**
 * The stored/raw shape of an instructor profile — bilingual fields kept
 * side by side, exactly how an Admin Panel form would edit them.
 */
export interface InstructorSlide {
  id: string;
  nameEn: string;
  nameAr: string;
  title: LocalizedText;
  qualification: LocalizedText;
  specialty: LocalizedText;
  bio: LocalizedText;
  experienceYears: number;
  studentsTaught: number;
  featuredCourseTitle: LocalizedText;
  profileHref: string;
  /** Transparent-background portrait — see docs/cms-overview.md §10. */
  imageId: string;
  displayOrder: number;
  isFeatured: boolean;
}

/**
 * The locale-resolved view model a component actually renders: bilingual
 * fields flattened to the active locale's string, and the image reference
 * resolved to a full MediaAsset.
 */
export interface ResolvedInstructorSlide {
  id: string;
  nameEn: string;
  nameAr: string;
  title: string;
  qualification: string;
  specialty: string;
  bio: string;
  experienceYears: number;
  studentsTaught: number;
  featuredCourseTitle: string;
  profileHref: string;
  image: ResolvedMediaAsset;
}
