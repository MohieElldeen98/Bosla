import { getTranslations } from "next-intl/server";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { SessionService } from "@/auth/services/session.service";
import { getMyInstructorApplicationAction } from "@/instructor/actions/instructor-application.actions";
import { PageTitle } from "@/components/admin/PageTitle";
import { EmptyState } from "@/components/admin/EmptyState";
import { InstructorApplicationForm } from "@/components/dashboard/InstructorApplicationForm";

/**
 * `/dashboard/apply-instructor` (Phase 6, Step 6.1) — the "Apply to
 * become an Instructor" entry point docs/roles-and-permissions.md §4
 * places on the Student Dashboard's Profile & Settings page. Built as
 * its own route rather than added to `/profile` — `/profile` is still
 * Phase 4's unbuilt `ComingSoonPage` placeholder (a separate, pre-
 * existing gap this step doesn't fill), and this is real, load-bearing
 * functionality that shouldn't live inside a "Coming Soon" page. Linked
 * from `/dashboard` instead (see `DashboardPage`'s `InstructorApplicationPrompt`).
 *
 * Shows the form only when no application exists yet; once one does,
 * shows its current status instead (no edit/resubmit — one application
 * per user, see `db/schema/instructor.ts`'s doc comment).
 */
export default async function ApplyInstructorPage() {
  const user = await SessionService.getCurrentUser();
  if (!user) return null;

  const t = await getTranslations("Instructor");
  const result = await getMyInstructorApplicationAction();
  const application = result.success ? result.data : null;

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-6 py-12 lg:px-8">
      <PageTitle title={t("apply.title")} description={t("apply.description")} />

      {!application && <InstructorApplicationForm />}

      {application?.status === "pending" && (
        <EmptyState icon={Clock3} title={t("status.pendingTitle")} description={t("status.pendingDescription")} />
      )}

      {application?.status === "approved" && (
        <EmptyState
          icon={CheckCircle2}
          title={t("status.approvedTitle")}
          description={t("status.approvedDescription")}
        />
      )}

      {application?.status === "rejected" && (
        <EmptyState icon={XCircle} title={t("status.rejectedTitle")} description={t("status.rejectedDescription")} />
      )}
    </div>
  );
}
