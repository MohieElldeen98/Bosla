import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { CoursesManager } from "@/components/admin/courses/CoursesManager";
import { CourseService } from "@/courses/services/course.service";
import { SpecialtyService } from "@/courses/services/specialty.service";
import { CategoryService } from "@/courses/services/category.service";
import { CourseInstructorService } from "@/courses/services/instructor.service";
import { SessionService } from "@/auth/services/session.service";
import { searchCoursesSchema } from "@/courses/validators/course.validator";
import type { Locale } from "@/i18n/routing";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * `/admin/courses` — Course Management (Step 3.2). Real courses listing:
 * server-side pagination/search/filter/sort, reading through the same
 * `CourseService`/`SpecialtyService`/`CategoryService`/
 * `CourseInstructorService` the rest of the app uses — no duplicated
 * business logic. Role-gating is already handled by
 * `(admin)/layout.tsx`'s `requireRoleOrForbidden` for every `/admin/*`
 * route; this page only re-reads the session to know the current user's
 * role for the Delete action's `PermissionGuard` (Super Admin only — see
 * `CourseService.delete`'s doc comment).
 *
 * URL search params drive every filter/sort/page value — a real server
 * round-trip on each change (`router.push`/`replace` in `CoursesManager`),
 * not client-side array slicing, which is what "server-side pagination"
 * means here. Malformed/missing params degrade to defaults via
 * `searchCoursesSchema`, never a crash.
 */
export default async function AdminCoursesPage({
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
    specialtyId: firstValue(rawSearchParams.specialtyId),
    categoryId: firstValue(rawSearchParams.categoryId),
    instructorId: firstValue(rawSearchParams.instructorId),
    sortBy: firstValue(rawSearchParams.sortBy),
    sortDirection: firstValue(rawSearchParams.sortDir),
    page: firstValue(rawSearchParams.page),
    pageSize: firstValue(rawSearchParams.pageSize),
  });
  const filters = parsed.success ? parsed.data : {};

  const [tNav, result, specialties, categories, instructors, user] = await Promise.all([
    getTranslations("Admin.nav.courses"),
    CourseService.searchResolved(filters, locale as Locale),
    SpecialtyService.listResolved(locale as Locale),
    CategoryService.listResolved(locale as Locale),
    CourseInstructorService.listResolved(locale as Locale),
    SessionService.getCurrentUser(),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle title={tNav("label")} description={tNav("description")} />
      <CoursesManager
        result={result}
        filters={filters}
        specialties={specialties}
        categories={categories}
        instructors={instructors}
        userRole={user?.role ?? "admin"}
      />
    </div>
  );
}
