import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { CreateEnrollmentForm } from "@/components/admin/enrollments/CreateEnrollmentForm";
import { ProfileService } from "@/auth/services/profile.service";
import { CourseService } from "@/courses/services/course.service";
import type { Locale } from "@/i18n/routing";

export default async function AdminNewEnrollmentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, students, courseResult] = await Promise.all([
    getTranslations("Admin.enrollments"),
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
      <PageTitle title={t("createTitle")} description={t("createDescription")} />
      <CreateEnrollmentForm students={studentOptions} courses={courseOptions} />
    </div>
  );
}
