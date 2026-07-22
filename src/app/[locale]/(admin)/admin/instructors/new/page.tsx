import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { InstructorEditorForm } from "@/components/admin/instructors/InstructorEditorForm";
import { SpecialtyService } from "@/courses/services/specialty.service";
import type { Locale } from "@/i18n/routing";

/** `/admin/instructors/new` — mirrors `/admin/courses/new`'s exact shell. */
export default async function AdminNewInstructorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const [tNav, specialties] = await Promise.all([
    getTranslations("Admin.nav.instructors"),
    SpecialtyService.listResolved(locale as Locale),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle title={tNav("label")} description={tNav("description")} />
      <InstructorEditorForm mode="create" instructor={null} specialties={specialties} />
    </div>
  );
}
