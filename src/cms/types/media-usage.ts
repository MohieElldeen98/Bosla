/** Every kind of place `media-usage.repository.ts`'s `USAGE_SOURCES`
 *  knows how to find a reference in — kept as a closed union (not
 *  `string`) so `Admin.media.detail.usage.types.*`'s translation keys
 *  stay exhaustively checked against it, the same way `MediaFileType`
 *  keeps `Admin.media.fileTypes.*` checked. */
export type MediaUsageType =
  | "instructor-avatar"
  | "instructor-portrait"
  | "course-cover"
  | "course-thumbnail"
  | "course-trailer"
  | "article-cover"
  | "article-body"
  | "lesson-video"
  | "lesson-attachment"
  | "seo-image"
  | "homepage-section"
  | "homepage-published"
  | "profile-avatar"
  | "legal-document";

/** One place a Media Library asset is attached — surfaced in the admin
 *  grid so "is this safe to delete" is a fact, not a guess. `href` is
 *  `null` for content types with no dedicated admin edit screen to link
 *  to (e.g. an SEO meta row or a lesson attachment). */
export interface MediaAssetUsage {
  type: MediaUsageType;
  label: string;
  href: string | null;
}
