import type { Locale } from "@/i18n/routing";
import type {
  FullyResolvedHeroSectionContent,
  ResolvedCtaSectionContent,
  ResolvedFaqSectionContent,
  ResolvedFeaturedCoursesSectionContent,
  ResolvedLearningExperienceSectionContent,
  ResolvedTestimonialsSectionContent,
  ResolvedWhyBoslaSectionContent,
} from "@/cms/types/section";

/**
 * The known homepage section types. Adding a new type here is an engineering
 * task (build the component, define its content shape in
 * `src/cms/types/section.ts`, register it in `SectionRenderer`) — the CMS
 * only ever reorders/edits/toggles instances of these known types. See
 * docs/cms-overview.md §1 for the reasoning.
 *
 * This is a legacy, camelCase-keyed union kept for the homepage's own
 * rendering pipeline (`SectionRenderer`'s `switch`); it maps 1:1 to a subset
 * of `CmsSectionType` (`src/cms/types/section.ts`) via
 * `src/repositories/homepage.repository.ts`'s section-type dictionary — see
 * docs/cms-overview.md "Migration path". `featured_instructors`,
 * `categories`, and `statistics` are registered CMS section types with no
 * standalone counterpart here (their content today lives embedded inside
 * Hero's instructor slider / statistics list).
 *
 * Footer and the navigation menus are deliberately not part of this list:
 * they're fixed sitewide chrome, not reorderable homepage content — see
 * docs/cms-overview.md §8-9.
 */
export type SectionType =
  | "hero"
  | "featuredCourses"
  | "whyBosla"
  | "learningExperience"
  | "testimonials"
  | "faq"
  | "cta";

/** Locale-resolved content shapes each section component renders — one
 *  variant per `SectionType`, reusing the CMS's own resolved content types
 *  (`src/cms/types/section.ts`) rather than duplicating them. */
export type ResolvedHomepageSectionContent =
  | FullyResolvedHeroSectionContent
  | ResolvedFeaturedCoursesSectionContent
  | ResolvedWhyBoslaSectionContent
  | ResolvedLearningExperienceSectionContent
  | ResolvedTestimonialsSectionContent
  | ResolvedFaqSectionContent
  | ResolvedCtaSectionContent;

/** The locale-resolved shape `SectionRenderer` (and, transitively, every
 *  section component) actually consumes — what
 *  `HomepageService.getSections()` returns. */
export interface HomepageSection {
  id: string;
  type: SectionType;
  enabled: boolean;
  displayOrder: number;
  locale: Locale;
  content: ResolvedHomepageSectionContent;
}
