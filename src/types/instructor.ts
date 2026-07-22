import type { ResolvedMediaAsset } from "@/types/media";

/**
 * The homepage Hero's per-slide render contract — built by
 * `HomepageService.resolveHeroContent` from a real `instructors` row
 * (`src/courses/types/instructor.ts`'s `Instructor`), not stored anywhere
 * in this shape. `nameEn`/`nameAr` stay split (rather than locale-
 * flattened like `ResolvedInstructor.name`) because `FloatingInstructorCard`
 * shows both languages side by side for the active slide.
 */
export interface ResolvedInstructorSlide {
  id: string;
  nameEn: string;
  nameAr: string;
  title: string;
  qualification: string;
  specialty: string;
  experienceYears: number;
  studentsTaught: number;
  profileHref: string;
  /** `null` only when no Public Portrait, personal avatar, or Hero
   *  fallback image resolves to anything real — `Hero.tsx` skips the
   *  portrait layer entirely rather than render a broken/empty image. */
  image: ResolvedMediaAsset | null;
}
