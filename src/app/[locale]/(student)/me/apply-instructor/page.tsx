import { getTranslations } from "next-intl/server";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { SessionService } from "@/auth/services/session.service";
import { getMyInstructorApplicationAction } from "@/instructor/actions/instructor-application.actions";
import { PageTitle } from "@/components/admin/PageTitle";
import { EmptyState } from "@/components/admin/EmptyState";
import { InstructorApplicationForm } from "@/components/dashboard/InstructorApplicationForm";

/** `/me/apply-instructor` — relocated from `/dashboard/apply-instructor`
 *  as-is, linked from the Overview tab's `InstructorApplicationPrompt`
 *  (students only). Shows the form only when no application exists yet;
 *  once one does, shows its current status instead (one application per
 *  user, see `db/schema/instructor.ts`'s doc comment). */
export default async function WorkspaceApplyInstructorPage() {
  const user = await SessionService.getCurrentUser();
  if (!user) return null;

  const t = await getTranslations("Instructor");
  const result = await getMyInstructorApplicationAction();
  const application = result.success ? result.data : null;

  return (
    <div className="max-w-2xl space-y-8">
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
