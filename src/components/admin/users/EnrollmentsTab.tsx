import { getTranslations } from "next-intl/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EnrollmentRowActions } from "@/components/admin/enrollments/EnrollmentRowActions";
import { GrantEnrollmentForm } from "@/components/admin/users/GrantEnrollmentForm";
import type { EnrollmentListItem } from "@/learning/types/enrollment-search";

/**
 * The User Details page's (Phase 7) Enrollments tab — the Enrollment
 * Domain reused verbatim: `EnrollmentRowActions` (Step 4.2) as-is for
 * View/Revoke/Restore, no parallel row-action component. Not paginated
 * (unlike `/admin/enrollments`'s own listing) — a single student's
 * enrollment count is bounded by how many courses exist, not worth a
 * second URL-param-driven pager nested inside a detail-page tab.
 */
export async function EnrollmentsTab({
  studentId,
  enrollments,
  locale,
  courseOptions,
}: {
  studentId: string;
  enrollments: EnrollmentListItem[];
  locale: string;
  courseOptions: { value: string; label: string }[];
}) {
  const t = await getTranslations("Admin.users.enrollments");
  const tEnrollments = await getTranslations("Admin.enrollments");

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("grantTitle")}</h2>
        <GrantEnrollmentForm studentId={studentId} courses={courseOptions} />
      </div>

      <div className="rounded-2xl border border-border bg-card">
        {enrollments.length === 0 ? (
          <div className="p-4 sm:p-6">
            <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tEnrollments("columns.course")}</TableHead>
                <TableHead>{tEnrollments("columns.source")}</TableHead>
                <TableHead>{tEnrollments("columns.status")}</TableHead>
                <TableHead>{tEnrollments("columns.grantedAt")}</TableHead>
                <TableHead>
                  <span className="sr-only">{tEnrollments("columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.map((enrollment) => (
                <TableRow key={enrollment.id}>
                  <TableCell className="font-medium text-foreground">{enrollment.courseTitle}</TableCell>
                  <TableCell className="text-muted-foreground">{tEnrollments(`source.${enrollment.source}`)}</TableCell>
                  <TableCell>
                    <StatusBadge status={enrollment.status}>{tEnrollments(`status.${enrollment.status}`)}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(enrollment.createdAt))}
                  </TableCell>
                  <TableCell>
                    <EnrollmentRowActions enrollment={enrollment} />
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
