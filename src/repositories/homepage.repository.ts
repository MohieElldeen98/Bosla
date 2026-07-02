import { cache } from "react";
import { CmsPageService } from "@/cms/services/page.service";
import { CmsPageVersionService } from "@/cms/services/page-version.service";
import type { Locale } from "@/i18n/routing";
import type { ResolvedCmsPage } from "@/cms/types/page";
import type { CmsSectionType } from "@/cms/types/section";
import type { SectionType } from "@/types/homepage";

/**
 * Legacy `SectionType` (camelCase) <-> `CmsSectionType` (snake_case, matches
 * the Postgres enum) mapping — see docs/cms-overview.md "Migration path".
 * Only the CMS types actually seeded onto the "home" page have an entry;
 * `featured_instructors` / `categories` / `statistics` are registered CMS
 * section types with no standalone homepage section today (their content
 * lives embedded inside Hero's instructor slider / statistics list) and are
 * intentionally omitted, so a homepage row of those types (there shouldn't
 * be one) is dropped rather than crashing.
 */
const CMS_TO_HOMEPAGE_SECTION_TYPE: Partial<Record<CmsSectionType, SectionType>> = {
  hero: "hero",
  featured_courses: "featuredCourses",
  why_bosla: "whyBosla",
  learning_experience: "learningExperience",
  testimonials: "testimonials",
  faq: "faq",
  cta: "cta",
};

/**
 * The stored/raw shape this repository returns: `content` stays `unknown`,
 * same convention `CmsSectionRepository` uses — narrowing it to a concrete
 * per-type shape (and, for `hero`, resolving its instructor slide
 * references) is `HomepageService`'s job.
 */
export interface HomepageSectionRecord {
  id: string;
  type: SectionType;
  enabled: boolean;
  displayOrder: number;
  content: unknown;
}

/**
 * One request-memoized fetch of the **published** "home" page (sections +
 * SEO) — Step 6.5: public visitors only ever see the latest
 * `cms_page_versions` snapshot, never live draft edits. Shared between the
 * homepage's data-fetching (`findAll` below) and `generateMetadata` in
 * `src/app/[locale]/page.tsx`, so both read the same resolved page instead
 * of querying twice per request. `null` when the page has never been
 * published.
 */
export const getHomeCmsPage = cache(
  (locale: Locale): Promise<ResolvedCmsPage | null> =>
    CmsPageVersionService.getPublishedResolvedBySlug("home", locale),
);

/**
 * The live **draft** "home" page — reads `cms_sections`/`cms_seo_meta`
 * directly, exactly like the Step 6.2-6.4 `getHomeCmsPage` used to. Used
 * only by Preview mode (`draftMode()`, docs/cms-overview.md §15) so an
 * admin can see unpublished edits rendered exactly as they'll look once
 * published, through this same rendering pipeline.
 */
export const getHomeCmsPageDraft = cache(
  (locale: Locale): Promise<ResolvedCmsPage | null> => CmsPageService.getResolvedBySlug("home", locale),
);

function toSectionRecords(page: ResolvedCmsPage | null): HomepageSectionRecord[] {
  if (!page) return [];

  return page.sections.flatMap((section) => {
    const type = CMS_TO_HOMEPAGE_SECTION_TYPE[section.sectionType];
    if (!type) return [];
    return [
      {
        id: section.id,
        type,
        enabled: section.isEnabled,
        displayOrder: section.position,
        content: section.content,
      },
    ];
  });
}

/**
 * Data-access layer for homepage sections — reads the "home" `cms_pages`
 * row (see docs/cms-overview.md §13 "Migration path"). `HomepageService`
 * and `SectionRenderer` are otherwise unchanged; this is the one seam that
 * moved from `src/mock/homepage-sections.mock.ts` to the real CMS.
 */
export const HomepageRepository = {
  async findAll(locale: Locale): Promise<HomepageSectionRecord[]> {
    return toSectionRecords(await getHomeCmsPage(locale));
  },

  /** Draft counterpart of `findAll`, for Preview mode only. */
  async findAllDraft(locale: Locale): Promise<HomepageSectionRecord[]> {
    return toSectionRecords(await getHomeCmsPageDraft(locale));
  },
};
