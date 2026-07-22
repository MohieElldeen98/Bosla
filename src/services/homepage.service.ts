import type { Locale } from "@/i18n/routing";
import { HomepageRepository, type HomepageSectionRecord } from "@/repositories/homepage.repository";
import { CourseInstructorService } from "@/courses/services/instructor.service";
import { SpecialtyService } from "@/courses/services/specialty.service";
import { CmsMediaService } from "@/cms/services/media.service";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import type { Instructor } from "@/courses/types/instructor";
import type { ResolvedHeroSectionContent } from "@/cms/types/section";
import type { ResolvedInstructorSlide } from "@/types/instructor";
import type { ResolvedMediaAsset } from "@/types/media";
import type { HomepageSection, ResolvedHomepageSectionContent } from "@/types/homepage";

const MAX_FEATURED_INSTRUCTORS = 4;

/** `publicPortraitImageId` first, then the instructor's own personal
 *  avatar, then the Hero section's own generic decorative image (already
 *  admin-editable via `HeroSectionForm`'s `imageId` field) — never an
 *  empty portrait slot. A small circular initials-avatar (the pattern
 *  `UserAvatar` uses elsewhere) isn't used here: `HeroPortrait` is a large
 *  full-bleed masked illustration, not a circular avatar slot, so a text
 *  badge would look broken in it rather than gracefully degrade. */
async function resolveInstructorImage(
  instructor: Instructor,
  fallbackImageId: string | null,
  locale: Locale,
): Promise<ResolvedMediaAsset | null> {
  const candidates = [instructor.publicPortraitImageId, instructor.avatarImageId, fallbackImageId];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const resolved = await CmsMediaService.getResolvedById(candidate, locale);
    if (resolved) return resolved;
  }
  return null;
}

/**
 * Hero is the one homepage section whose content needs enrichment beyond
 * generic CMS locale-resolution: which instructors appear is data-driven
 * (`instructors.is_featured`/`display_order`, the real `courses.instructors`
 * content table — see that table's own doc comment on why this avoids two
 * places editing the same fact), not stored in the Hero's own CMS content.
 * Resolving *which* instructor and their display data is homepage-specific
 * business logic (a cross-domain join into `CourseInstructorService`), not
 * something `CmsSectionService`'s generic resolver can or should know
 * about.
 */
async function resolveHeroContent(
  content: ResolvedHeroSectionContent,
  locale: Locale,
): Promise<ResolvedHomepageSectionContent> {
  const featured = (await CourseInstructorService.listFeatured()).slice(0, MAX_FEATURED_INSTRUCTORS);

  const [specialties, studentCounts] = await Promise.all([
    SpecialtyService.listResolved(locale),
    CourseInstructorService.countEnrolledStudents(featured.map((instructor) => instructor.id)),
  ]);
  const specialtyNameById = new Map(specialties.map((specialty) => [specialty.id, specialty.name]));

  const slides = await Promise.all(
    featured.map(async (instructor) => {
      const image = await resolveInstructorImage(instructor, content.imageId ?? null, locale);
      const resolved: ResolvedInstructorSlide = {
        id: instructor.id,
        nameEn: instructor.name.en,
        nameAr: instructor.name.ar,
        title: resolveLocalizedText(instructor.title, locale) ?? "",
        qualification: resolveLocalizedText(instructor.qualification, locale) ?? "",
        specialty: instructor.specialtyId ? (specialtyNameById.get(instructor.specialtyId) ?? "") : "",
        experienceYears: instructor.experienceYears ?? 0,
        studentsTaught: studentCounts[instructor.id] ?? 0,
        profileHref: "/#courses",
        image,
      };
      return { id: instructor.id, instructor: resolved };
    }),
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

async function resolveSections(
  records: HomepageSectionRecord[],
  locale: Locale,
): Promise<HomepageSection[]> {
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
}

export const HomepageService = {
  async getSections(locale: Locale): Promise<HomepageSection[]> {
    return resolveSections(await HomepageRepository.findAll(locale), locale);
  },
};
