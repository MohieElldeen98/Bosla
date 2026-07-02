import type { LocalizedText } from "@/types/i18n";
import type { CmsIconKey, CmsLink, LocalizedRichText } from "@/cms/types/content-blocks";
import type { ResolvedInstructorSlide } from "@/types/instructor";

/**
 * The fixed section-type registry (docs/cms-overview.md §1). Mirrors
 * `db/schema/cms.ts`'s `cms_section_type` Postgres enum exactly — the two
 * change together. Values are snake_case (matching the DB enum verbatim)
 * so no name-mapping layer exists between the database and this type,
 * unlike the pre-existing `SectionType` in `src/types/homepage.ts` (a
 * separate, legacy, camelCase-keyed union that still powers today's live
 * mock-driven homepage — see docs/cms-overview.md "Migration path" for how
 * the two relate).
 */
export const CMS_SECTION_TYPES = [
  "hero",
  "featured_instructors",
  "featured_courses",
  "categories",
  "why_bosla",
  "learning_experience",
  "testimonials",
  "faq",
  "statistics",
  "cta",
] as const;

export type CmsSectionType = (typeof CMS_SECTION_TYPES)[number];

// ---------------------------------------------------------------------------
// Per-type content shapes. Each has a "raw" (stored, bilingual-fields-as-
// LocalizedText) and "resolved" (locale-flattened, what a component would
// render) variant, exactly mirroring the existing Hero/Instructor pattern
// from `src/types/homepage.ts` / `src/types/instructor.ts`.
// ---------------------------------------------------------------------------

/** One slide of the Hero's portrait slider — only *which* instructor and in
 *  what order is CMS content; the instructor's own profile fields are
 *  authored elsewhere (`InstructorService`, per docs/cms-overview.md §4) and
 *  resolved by reference, not duplicated into section content. */
export interface HeroSlideRef {
  id: string;
  instructorId: string;
}

export interface HeroSectionContent {
  eyebrow: LocalizedText;
  headlineLine1: LocalizedText;
  headlineLine2: LocalizedText;
  headlineLine3: LocalizedText;
  description: LocalizedText;
  imageId?: string;
  primaryButton: CmsLink;
  secondaryButton?: CmsLink;
  highlights: { id: string; icon: CmsIconKey; label: LocalizedText }[];
  statistics: { id: string; icon: CmsIconKey; value: string; label: LocalizedText }[];
  slides: HeroSlideRef[];
}
export interface ResolvedHeroSectionContent {
  eyebrow: string;
  headlineLine1: string;
  headlineLine2: string;
  headlineLine3: string;
  description: string;
  imageId?: string;
  primaryButton: { label: string; href: string };
  secondaryButton?: { label: string; href: string };
  highlights: { id: string; icon: CmsIconKey; label: string }[];
  statistics: { id: string; icon: CmsIconKey; value: string; label: string }[];
  /** Resolved by `HomepageService`, not `CmsSectionService` — instructor
   *  lookup is homepage-specific enrichment, not generic CMS locale
   *  resolution (see docs/cms-overview.md "Migration path"). Still `[]` (not
   *  `ResolvedInstructorSlide[]`) at the raw CMS-resolution layer. */
  slides: HeroSlideRef[];
}

/** The Hero content shape once `HomepageService` has additionally resolved
 *  each slide's instructor reference — what the `Hero` component renders. */
export interface FullyResolvedHeroSectionContent extends Omit<ResolvedHeroSectionContent, "slides"> {
  slides: { id: string; instructor: ResolvedInstructorSlide }[];
}

/** Which instructors appear is data-driven (an `is_featured` flag on the
 *  instructor record itself, per docs/cms-overview.md §4) — this section's
 *  own content is display configuration only. */
export interface FeaturedInstructorsSectionContent {
  eyebrow: LocalizedText;
  title: LocalizedText;
  subtitle?: LocalizedText;
  maxItems?: number;
}
export interface ResolvedFeaturedInstructorsSectionContent {
  eyebrow: string;
  title: string;
  subtitle?: string;
  maxItems?: number;
}

/** Which courses appear is data-driven (an `is_featured` flag on the
 *  course record, per docs/cms-overview.md §5) — display configuration
 *  only, avoiding two places that edit the same fact. */
export interface FeaturedCoursesSectionContent {
  eyebrow: LocalizedText;
  title: LocalizedText;
  subtitle?: LocalizedText;
  maxItems?: number;
}
export interface ResolvedFeaturedCoursesSectionContent {
  eyebrow: string;
  title: string;
  subtitle?: string;
  maxItems?: number;
}

export interface CategoriesSectionContent {
  eyebrow: LocalizedText;
  title: LocalizedText;
  subtitle?: LocalizedText;
  items: {
    id: string;
    icon: CmsIconKey;
    label: LocalizedText;
    href: string;
    imageId?: string;
  }[];
}
export interface ResolvedCategoriesSectionContent {
  eyebrow: string;
  title: string;
  subtitle?: string;
  items: { id: string; icon: CmsIconKey; label: string; href: string; imageId?: string }[];
}

/** Live homepage section beyond the original 8 (docs/cms-overview.md §13
 *  "Migration path") — the platform's four differentiator pillars. */
export interface WhyBoslaSectionContent {
  eyebrow: LocalizedText;
  title: LocalizedText;
  subtitle: LocalizedText;
  items: { id: string; icon: CmsIconKey; title: LocalizedText; description: LocalizedText }[];
}
export interface ResolvedWhyBoslaSectionContent {
  eyebrow: string;
  title: string;
  subtitle: string;
  items: { id: string; icon: CmsIconKey; title: string; description: string }[];
}

/** Live homepage section beyond the original 8 (docs/cms-overview.md §13
 *  "Migration path"). The right-hand lesson-player mockup (chapters,
 *  timestamp) is decorative/code-driven, same precedent as Hero's dashboard
 *  illustration — only the left column's copy is CMS content. */
export interface LearningExperienceSectionContent {
  eyebrow: LocalizedText;
  title: LocalizedText;
  subtitle: LocalizedText;
  capabilities: { id: string; label: LocalizedText }[];
}
export interface ResolvedLearningExperienceSectionContent {
  eyebrow: string;
  title: string;
  subtitle: string;
  capabilities: { id: string; label: string }[];
}

/** The testimonials themselves are real, curated student reviews, not
 *  authored here (docs/cms-overview.md §3) — display configuration only. */
export interface TestimonialsSectionContent {
  eyebrow: LocalizedText;
  title: LocalizedText;
  subtitle?: LocalizedText;
}
export interface ResolvedTestimonialsSectionContent {
  eyebrow: string;
  title: string;
  subtitle?: string;
}

export interface FaqSectionContent {
  eyebrow: LocalizedText;
  title: LocalizedText;
  items: { id: string; question: LocalizedText; answer: LocalizedRichText }[];
}
export interface ResolvedFaqSectionContent {
  eyebrow: string;
  title: string;
  items: { id: string; question: string; answer: string }[];
}

export interface StatisticsSectionContent {
  eyebrow: LocalizedText;
  title: LocalizedText;
  items: { id: string; icon: CmsIconKey; value: string; label: LocalizedText }[];
}
export interface ResolvedStatisticsSectionContent {
  eyebrow: string;
  title: string;
  items: { id: string; icon: CmsIconKey; value: string; label: string }[];
}

export interface CtaSectionContent {
  title: LocalizedText;
  subtitle?: LocalizedText;
  primaryButton: CmsLink;
  secondaryButton?: CmsLink;
  backgroundImageId?: string;
}
export interface ResolvedCtaSectionContent {
  title: string;
  subtitle?: string;
  primaryButton: { label: string; href: string };
  secondaryButton?: { label: string; href: string };
  backgroundImageId?: string;
}

/** Keyed union — `content`'s shape depends on `sectionType`. Repositories
 *  store/return this loosely typed (`Record<string, unknown>`, matching the
 *  `jsonb` column); services narrow it via the schema registry in
 *  `src/cms/validators/section-content.schemas.ts` before handing it to a
 *  caller as one of these concrete types. */
export type CmsSectionContentByType = {
  hero: HeroSectionContent;
  featured_instructors: FeaturedInstructorsSectionContent;
  featured_courses: FeaturedCoursesSectionContent;
  categories: CategoriesSectionContent;
  why_bosla: WhyBoslaSectionContent;
  learning_experience: LearningExperienceSectionContent;
  testimonials: TestimonialsSectionContent;
  faq: FaqSectionContent;
  statistics: StatisticsSectionContent;
  cta: CtaSectionContent;
};
export type ResolvedCmsSectionContentByType = {
  hero: ResolvedHeroSectionContent;
  featured_instructors: ResolvedFeaturedInstructorsSectionContent;
  featured_courses: ResolvedFeaturedCoursesSectionContent;
  categories: ResolvedCategoriesSectionContent;
  why_bosla: ResolvedWhyBoslaSectionContent;
  learning_experience: ResolvedLearningExperienceSectionContent;
  testimonials: ResolvedTestimonialsSectionContent;
  faq: ResolvedFaqSectionContent;
  statistics: ResolvedStatisticsSectionContent;
  cta: ResolvedCtaSectionContent;
};

/** The stored/raw row shape (matches `db/schema/cms.ts`'s `cms_sections`). */
export interface CmsSection<T extends CmsSectionType = CmsSectionType> {
  id: string;
  pageId: string;
  sectionType: T;
  isEnabled: boolean;
  position: number;
  content: CmsSectionContentByType[T];
  createdAt: string;
  updatedAt: string;
}

/** The locale-resolved shape a future component would render. */
export interface ResolvedCmsSection<T extends CmsSectionType = CmsSectionType> {
  id: string;
  sectionType: T;
  isEnabled: boolean;
  position: number;
  content: ResolvedCmsSectionContentByType[T];
}

export interface NewCmsSectionInput<T extends CmsSectionType = CmsSectionType> {
  pageId: string;
  sectionType: T;
  content: CmsSectionContentByType[T];
  isEnabled?: boolean;
  position?: number;
}
