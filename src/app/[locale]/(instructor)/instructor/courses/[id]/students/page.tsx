import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { EmptyState } from "@/components/admin/EmptyState";
import { CourseWorkspaceHeader } from "@/components/instructor/course-workspace/CourseWorkspaceHeader";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SessionService } from "@/auth/services/session.service";
import { CourseService } from "@/courses/services/course.service";
import { EnrollmentService } from "@/learning/services/enrollment.service";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import type { Locale } from "@/i18n/routing";

/**
 * `/instructor/courses/[id]/students` — the Course Workspace's Students
 * tab (Sprint 9 UX pass). `/instructor/students` already lists every
 * enrollment across all of the Instructor's courses (Phase 6, Step 6.6);
 * this reuses that exact same `EnrollmentService.listForInstructor` call
 * — no repository/service change — and filters to this one course at
 * the page layer, since "who's enrolled in *this* course" is exactly
 * what someone lands here to see, without scanning a global table for
 * matching rows.
 */
export default async function InstructorCourseStudentsPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const user = await SessionService.getCurrentUser();
  if (!user) return null;

  const course = await CourseService.getOwnById(user, id);
  if (!course) {
    const tEmpty = await getTranslations("Admin.emptyState");
    return <EmptyState title={tEmpty("defaultTitle")} description={tEmpty("defaultDescription")} />;
  }

  const [t, allStudents] = await Promise.all([
    getTranslations("Instructor.courseWorkspace.students"),
    EnrollmentService.listForInstructor(user, locale as Locale),
  ]);
  const tStatus = await getTranslations("Instructor.students.status");
  const tColumns = await getTranslations("Instructor.students.columns");

  const courseTitle = resolveLocalizedText(course.title, locale as Locale);
  const students = allStudents.filter((student) => student.courseId === course.id);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-12 lg:px-8">
      <PageTitle title={t("title")} description={t("description", { courseTitle })} />
      <CourseWorkspaceHeader courseId={course.id} courseTitle={courseTitle} tabLabel={t("title")} />

      <div className="rounded-2xl border border-border bg-card">
        {students.length === 0 ? (
          <div className="p-4 sm:p-6">
            <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tColumns("student")}</TableHead>
                <TableHead>{tColumns("progress")}</TableHead>
                <TableHead>{tColumns("status")}</TableHead>
                <TableHead>{tColumns("enrolledAt")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.enrollmentId}>
                  <TableCell>
                    <div className="font-medium text-foreground">{student.studentName}</div>
                    <div className="text-xs text-muted-foreground">{student.studentEmail}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{student.progressPercentage}%</TableCell>
                  <TableCell>
                    <Badge variant={student.status === "active" ? "default" : "secondary"}>
                      {tStatus(student.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(student.enrolledAt))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
