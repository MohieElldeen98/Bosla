import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EnrollmentRowActions } from "@/components/admin/enrollments/EnrollmentRowActions";
import { EnrollmentService } from "@/learning/services/enrollment.service";
import type { Locale } from "@/i18n/routing";

/** `/admin/enrollments/[id]` — the "View enrollment details" action
 *  (Step 4.2): a read-only detail view (student, course, granted by,
 *  source, status, timestamps) with the same Revoke/Restore row action
 *  the listing uses, reused as-is. */
export default async function AdminEnrollmentDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const enrollment = await EnrollmentService.getResolvedById(id, locale as Locale);

  if (!enrollment) {
    const t = await getTranslations("Admin.emptyState");
    return <EmptyState title={t("defaultTitle")} description={t("defaultDescription")} />;
  }

  const [t, tFields] = await Promise.all([
    getTranslations("Admin.enrollments"),
    getTranslations("Admin.enrollments.columns"),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle
        title={t("detailTitle", { name: enrollment.studentName })}
        description={enrollment.courseTitle}
        actions={<EnrollmentRowActions enrollment={enrollment} />}
      />

      <div className="max-w-lg rounded-2xl border border-border bg-card p-6">
        <dl className="space-y-4 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{tFields("student")}</dt>
            <dd className="text-end font-medium text-foreground">
              {enrollment.studentName}
              {enrollment.studentEmail && (
                <span className="block text-xs font-normal text-muted-foreground">{enrollment.studentEmail}</span>
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{tFields("course")}</dt>
            <dd className="font-medium text-foreground">{enrollment.courseTitle}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{tFields("grantedBy")}</dt>
            <dd className="font-medium text-foreground">{enrollment.grantedByName ?? "—"}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{tFields("source")}</dt>
            <dd className="font-medium text-foreground">{t(`source.${enrollment.source}`)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{tFields("status")}</dt>
            <dd>
              <StatusBadge status={enrollment.status}>{t(`status.${enrollment.status}`)}</StatusBadge>
            </dd>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <dt className="text-muted-foreground">{tFields("grantedAt")}</dt>
            <dd className="font-medium text-foreground">
              {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
                new Date(enrollment.createdAt),
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{tFields("updatedAt")}</dt>
            <dd className="font-medium text-foreground">
              {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
                new Date(enrollment.updatedAt),
              )}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
