import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { InstructorsManager } from "@/components/admin/instructors/InstructorsManager";
import { CourseInstructorService } from "@/courses/services/instructor.service";
import { SpecialtyService } from "@/courses/services/specialty.service";
import { CmsMediaService } from "@/cms/services/media.service";
import type { Locale } from "@/i18n/routing";

/**
 * `/admin/instructors` — the Instructors content directory: name/bio/
 * specialty/Public Portrait, plus the Featured Instructors panel that
 * drives the homepage Hero. Distinct from `/admin/instructor-applications`
 * (approving `instructor_profiles` signups). Reads through
 * `CourseInstructorService`/`SpecialtyService`/`CmsMediaService` — no
 * duplicated query logic. Row-count is small enough (dozens, not
 * thousands) that this skips `CoursesManager`'s server-side pagination in
 * favor of a plain full list with client-side search.
 */
export default async function AdminInstructorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = locale as Locale;

  const [tNav, instructors, specialties] = await Promise.all([
    getTranslations("Admin.nav.instructors"),
    CourseInstructorService.listResolved(loc),
    SpecialtyService.listResolved(loc),
  ]);

  const imageIds = Array.from(
    new Set(
      instructors.flatMap((instructor) =>
        [instructor.publicPortraitImageId, instructor.avatarImageId].filter((id): id is string => !!id),
      ),
    ),
  );
  const images = await CmsMediaService.getResolvedByIds(imageIds, loc);
  const thumbnailById = new Map(images.map((image) => [image.id, image.thumbnailUrl ?? image.url]));

  const specialtyNameById = new Map(specialties.map((specialty) => [specialty.id, specialty.name]));

  const items = instructors.map((instructor) => ({
    id: instructor.id,
    name: instructor.name,
    specialtyName: instructor.specialtyId ? (specialtyNameById.get(instructor.specialtyId) ?? null) : null,
    thumbnailUrl:
      (instructor.publicPortraitImageId && thumbnailById.get(instructor.publicPortraitImageId)) ||
      (instructor.avatarImageId && thumbnailById.get(instructor.avatarImageId)) ||
      null,
    isActive: instructor.isActive,
    isFeatured: instructor.isFeatured,
    displayOrder: instructor.displayOrder,
  }));

  const featuredOptions = instructors
    .filter((instructor) => instructor.isActive)
    .map((instructor) => ({
      id: instructor.id,
      name: instructor.name,
      thumbnailUrl:
        (instructor.publicPortraitImageId && thumbnailById.get(instructor.publicPortraitImageId)) ||
        (instructor.avatarImageId && thumbnailById.get(instructor.avatarImageId)) ||
        null,
    }));

  const initialFeatured = instructors
    .filter((instructor) => instructor.isFeatured)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((instructor) => instructor.id);

  return (
    <div className="space-y-6">
      <PageTitle title={tNav("label")} description={tNav("description")} />
      <InstructorsManager items={items} featuredOptions={featuredOptions} initialFeatured={initialFeatured} />
    </div>
  );
}
