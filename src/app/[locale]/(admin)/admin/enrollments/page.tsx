import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { EnrollmentsManager } from "@/components/admin/enrollments/EnrollmentsManager";
import { EnrollmentService } from "@/learning/services/enrollment.service";
import { ProfileService } from "@/auth/services/profile.service";
import { CourseService } from "@/courses/services/course.service";
import { searchEnrollmentsSchema } from "@/learning/validators/enrollment.validator";
import type { Locale } from "@/i18n/routing";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * `/admin/enrollments` — the admin Enrollment Management listing (Step
 * 4.2). Reads through `EnrollmentService.searchResolved` (new this step)
 * and the existing `ProfileService`/`CourseService` for the Student/
 * Course filter dropdown options — no duplicated query logic. Permissions
 * are already enforced by `(admin)/layout.tsx` for every `/admin/*`
 * route; `EnrollmentService`'s own mutations re-check regardless.
 */
export default async function AdminEnrollmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;

  const parsed = searchEnrollmentsSchema.safeParse({
    query: firstValue(rawSearchParams.q),
    studentId: firstValue(rawSearchParams.studentId),
    courseId: firstValue(rawSearchParams.courseId),
    status: firstValue(rawSearchParams.status),
    sortBy: firstValue(rawSearchParams.sortBy),
    sortDirection: firstValue(rawSearchParams.sortDir),
    page: firstValue(rawSearchParams.page),
    pageSize: firstValue(rawSearchParams.pageSize),
  });
  const filters = parsed.success ? parsed.data : {};

  const [tNav, result, students, courseResult] = await Promise.all([
    getTranslations("Admin.nav.enrollments"),
    EnrollmentService.searchResolved(filters, locale as Locale),
    ProfileService.search({ role: "student", limit: 100 }),
    CourseService.searchResolved({ pageSize: 100 }, locale as Locale),
  ]);

  const studentOptions = students.map((student) => ({
    id: student.userId,
    label: student.displayName ?? student.fullName ?? student.email,
  }));
  const courseOptions = courseResult.items.map((course) => ({ id: course.id, label: course.title }));

  return (
    <div className="space-y-6">
      <PageTitle title={tNav("label")} description={tNav("description")} />
      <EnrollmentsManager result={result} filters={filters} students={studentOptions} courses={courseOptions} />
    </div>
  );
}
