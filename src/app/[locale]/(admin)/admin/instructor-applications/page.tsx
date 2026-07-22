import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { InstructorApplicationsManager } from "@/components/admin/instructors/InstructorApplicationsManager";
import { InstructorApplicationService } from "@/instructor/services/instructor-application.service";
import { searchInstructorApplicationsSchema } from "@/instructor/validators/instructor-application.validator";
import type { Locale } from "@/i18n/routing";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * `/admin/instructor-applications` — the Instructor Applications listing
 * (approve/reject `instructor_profiles` signups). Renamed from
 * `/admin/instructors`, which now hosts the real Instructors content
 * directory (name/bio/Public Portrait/Featured Instructors — see
 * `src/app/[locale]/(admin)/admin/instructors/page.tsx`); this workflow is
 * about approving people, not curating catalog content, so it moved to the
 * "people" nav group. Mirrors `/admin/orders`'s exact shell: server-side
 * pagination/search/filter/sort, all URL-driven. Reads through
 * `InstructorApplicationService.searchResolved` — no duplicated query
 * logic. Permissions are already enforced by `(admin)/layout.tsx` for
 * every `/admin/*` route; `InstructorApplicationService`'s own
 * mutations (`approve`/`reject`) re-check regardless of which UI called
 * them.
 */
export default async function AdminInstructorApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;

  const parsed = searchInstructorApplicationsSchema.safeParse({
    query: firstValue(rawSearchParams.q),
    status: firstValue(rawSearchParams.status),
    sortBy: firstValue(rawSearchParams.sortBy),
    sortDirection: firstValue(rawSearchParams.sortDir),
    page: firstValue(rawSearchParams.page),
    pageSize: firstValue(rawSearchParams.pageSize),
  });
  const filters = parsed.success ? parsed.data : {};

  const [tNav, result] = await Promise.all([
    getTranslations("Admin.nav.instructorApplications"),
    InstructorApplicationService.searchResolved(filters, locale as Locale),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle title={tNav("label")} description={tNav("description")} />
      <InstructorApplicationsManager result={result} filters={filters} />
    </div>
  );
}
