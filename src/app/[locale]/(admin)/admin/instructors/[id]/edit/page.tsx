import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { InstructorEditorForm } from "@/components/admin/instructors/InstructorEditorForm";
import { CourseInstructorService } from "@/courses/services/instructor.service";
import { SpecialtyService } from "@/courses/services/specialty.service";
import type { Locale } from "@/i18n/routing";

/** `/admin/instructors/[id]/edit` — mirrors `/admin/courses/[id]/edit`'s
 *  exact shell. */
export default async function AdminEditInstructorPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const [tNav, instructor, specialties] = await Promise.all([
    getTranslations("Admin.nav.instructors"),
    CourseInstructorService.getById(id),
    SpecialtyService.listResolved(locale as Locale),
  ]);

  if (!instructor) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageTitle title={tNav("label")} description={tNav("description")} />
      <InstructorEditorForm mode="edit" instructor={instructor} specialties={specialties} />
    </div>
  );
}
