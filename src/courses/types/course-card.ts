/**
 * The fields `CourseCard` actually renders — a structural display
 * contract rather than a reuse of `CourseListItem`, so any surface that
 * can supply these renders the one card family: catalog rows satisfy it
 * natively, and the Student Dashboard composes it from enrollment data
 * (which has no search-result fields like ids/status/sort metadata).
 * Nullable name fields simply hide their element on the card.
 */
export interface CourseCardData {
  slug: string;
  title: string;
  specialtyName: string | null;
  categoryName: string | null;
  instructorName: string;
  instructorQualification: string | null;
  instructorAvatarUrl: string | null;
  level: string;
  price: string;
  originalPrice: string | null;
  currency: string;
  isFree: boolean;
  featured: boolean;
  certificateAvailable: boolean;
  lessonCount: number;
  estimatedDurationMinutes: number | null;
  coverImageUrl: string | null;
}
