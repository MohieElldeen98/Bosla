import type { Locale } from "@/i18n/routing";
import { HomepageRepository, type HomepageSectionRecord } from "@/repositories/homepage.repository";
import { InstructorService } from "@/services/instructor.service";
import type { ResolvedHeroSectionContent } from "@/cms/types/section";
import type { HomepageSection, ResolvedHomepageSectionContent } from "@/types/homepage";

/**
 * Hero is the one homepage section whose content needs enrichment beyond
 * generic CMS locale-resolution: `slides` are stored as instructor
 * references (`{id, instructorId}`), and resolving *which instructor* is
 * homepage-specific business logic (a cross-domain join into
 * `InstructorService`), not something `CmsSectionService`'s generic
 * resolver can or should know about.
 */
async function resolveHeroContent(
  content: ResolvedHeroSectionContent,
  locale: Locale,
): Promise<ResolvedHomepageSectionContent> {
  const slides = await Promise.all(
    content.slides.map(async (slide) => ({
      id: slide.id,
      instructor: await InstructorService.getById(slide.instructorId, locale),
    })),
  );
  return { ...content, slides };
}

async function resolveContent(
  record: HomepageSectionRecord,
  locale: Locale,
): Promise<ResolvedHomepageSectionContent> {
  if (record.type === "hero") {
    return resolveHeroContent(record.content as ResolvedHeroSectionContent, locale);
  }
  return record.content as ResolvedHomepageSectionContent;
}

export const HomepageService = {
  async getSections(locale: Locale): Promise<HomepageSection[]> {
    const records = await HomepageRepository.findAll(locale);
    const enabledRecords = records
      .filter((record) => record.enabled)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    return Promise.all(
      enabledRecords.map(async (record) => ({
        id: record.id,
        type: record.type,
        enabled: record.enabled,
        displayOrder: record.displayOrder,
        locale,
        content: await resolveContent(record, locale),
      })),
    );
  },
};
