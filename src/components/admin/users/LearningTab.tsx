import { getTranslations } from "next-intl/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/admin/EmptyState";
import type { DashboardCourseItem } from "@/learning/types/student-dashboard";

/**
 * The User Details page's (Phase 7) Learning tab — reuses
 * `StudentDashboardService.getDashboard` verbatim (the exact same call
 * the Student Dashboard, Step 4.3, makes for the signed-in student's own
 * `/dashboard`), just rendered as an admin-facing table instead of
 * course cards. No progress math lives here — `completedLessons`/
 * `totalLessons`/`progressPercentage`/`completionStatus` all come
 * straight from that one service call, never recomputed.
 */
export async function LearningTab({ courses, locale }: { courses: DashboardCourseItem[]; locale: string }) {
  const t = await getTranslations("Admin.users.learning");

  if (courses.length === 0) {
    return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  return (
    <div className="rounded-2xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columns.course")}</TableHead>
            <TableHead>{t("columns.progress")}</TableHead>
            <TableHead>{t("columns.status")}</TableHead>
            <TableHead>{t("columns.lastActivity")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courses.map((course) => (
            <TableRow key={course.enrollmentId}>
              <TableCell>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{course.courseTitle}</p>
                  {course.instructorName && (
                    <p className="truncate text-xs text-muted-foreground">{course.instructorName}</p>
                  )}
                </div>
              </TableCell>
              <TableCell className="min-w-40">
                <div className="flex items-center gap-2">
                  <Progress value={course.progressPercentage} className="w-24" />
                  <span className="text-xs text-muted-foreground">
                    {course.completedLessons}/{course.totalLessons}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={course.completionStatus === "completed" ? "default" : "secondary"}>
                  {t(`completionStatus.${course.completionStatus}`)}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {course.lastActivityAt
                  ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(course.lastActivityAt))
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
