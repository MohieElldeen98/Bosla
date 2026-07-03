import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { SessionService } from "@/auth/services/session.service";
import { CourseService } from "@/courses/services/course.service";
import { searchCoursesSchema } from "@/courses/validators/course.validator";
import { InstructorCoursesManager } from "@/components/instructor/courses/InstructorCoursesManager";
import type { Locale } from "@/i18n/routing";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * `/instructor/courses` — "My Courses" (Phase 6, Step 6.3). Mirrors
 * `/admin/courses`'s exact shell (server-side pagination/search/filter,
 * URL-driven), scoped to the signed-in Instructor's own courses only —
 * enforced in `CourseService.searchResolvedForInstructor`, not here;
 * this page can't accidentally leak another Instructor's courses no
 * matter what a tampered `instructorId` query param might say, since
 * that filter is never read from `filters` in the first place. Reachable
 * only by an approved Instructor — `(instructor)/layout.tsx`'s guard
 * already ran before this renders.
 */
export default async function InstructorCoursesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;

  const parsed = searchCoursesSchema.safeParse({
    query: firstValue(rawSearchParams.q),
    status: firstValue(rawSearchParams.status),
    sortBy: firstValue(rawSearchParams.sortBy),
    sortDirection: firstValue(rawSearchParams.sortDir),
    page: firstValue(rawSearchParams.page),
    pageSize: firstValue(rawSearchParams.pageSize),
  });
  const filters = parsed.success ? parsed.data : {};

  const user = await SessionService.getCurrentUser();
  if (!user) return null;

  const [t, result] = await Promise.all([
    getTranslations("Instructor.myCourses"),
    CourseService.searchResolvedForInstructor(user, filters, locale as Locale),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-12 lg:px-8">
      <PageTitle title={t("title")} description={t("description")} />
      <InstructorCoursesManager result={result} filters={filters} />
    </div>
  );
}
