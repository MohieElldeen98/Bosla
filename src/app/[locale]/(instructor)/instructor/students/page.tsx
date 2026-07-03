import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { EmptyState } from "@/components/admin/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SessionService } from "@/auth/services/session.service";
import { EnrollmentService } from "@/learning/services/enrollment.service";
import type { Locale } from "@/i18n/routing";

/**
 * `/instructor/students` (Phase 6, Step 6.6) — read-only, no row
 * actions: an Instructor can see who's enrolled in their own courses
 * and how far along they are, not manage the enrollment itself (that
 * stays an Admin capability, `/admin/enrollments`, matching
 * docs/roles-and-permissions.md §5's "no access to other instructors'
 * students" scope). No search/filter/pagination — same "deliberately
 * minimal, no analytics yet" scope `/instructor` (Step 6.3) already
 * established for its own course counts.
 */
export default async function InstructorStudentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await SessionService.getCurrentUser();
  if (!user) return null;

  const [t, students] = await Promise.all([
    getTranslations("Instructor.students"),
    EnrollmentService.listForInstructor(user, locale as Locale),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-12 lg:px-8">
      <PageTitle title={t("title")} description={t("description")} />

      <div className="rounded-2xl border border-border bg-card">
        {students.length === 0 ? (
          <div className="p-4 sm:p-6">
            <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.student")}</TableHead>
                <TableHead>{t("columns.course")}</TableHead>
                <TableHead>{t("columns.progress")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>{t("columns.enrolledAt")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.enrollmentId}>
                  <TableCell>
                    <div className="font-medium text-foreground">{student.studentName}</div>
                    <div className="text-xs text-muted-foreground">{student.studentEmail}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{student.courseTitle}</TableCell>
                  <TableCell className="text-muted-foreground">{student.progressPercentage}%</TableCell>
                  <TableCell>
                    <Badge variant={student.status === "active" ? "default" : "secondary"}>
                      {t(`status.${student.status}`)}
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
