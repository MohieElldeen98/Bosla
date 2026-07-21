import { getTranslations } from "next-intl/server";
import { Clock3, FileQuestion, XCircle } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import type { InstructorApplicationStatus } from "@/instructor/types/instructor-profile";

/**
 * `(instructor)/layout.tsx`'s in-place state for a `role === "instructor"`
 * user who isn't (yet, or no longer) an approved applicant — `status`
 * is `null` when no `instructor_profiles` row exists at all (only
 * reachable via a direct Super Admin role change through
 * `/admin/users`, bypassing the application entirely).
 */
export async function InstructorApplicationReviewPage({
  status,
}: {
  status: InstructorApplicationStatus | null;
}) {
  const t = await getTranslations("Instructor.status");

  if (status === "rejected") {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-24">
        <EmptyState
          icon={XCircle}
          title={t("rejectedTitle")}
          description={t("rejectedDescription")}
          action={
            <Link href="/me" className={buttonVariants({ variant: "outline" })}>
              {t("backToDashboard")}
            </Link>
          }
        />
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-24">
        <EmptyState
          icon={Clock3}
          title={t("pendingTitle")}
          description={t("pendingDescription")}
          action={
            <Link href="/me" className={buttonVariants({ variant: "outline" })}>
              {t("backToDashboard")}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-24">
      <EmptyState
        icon={FileQuestion}
        title={t("noApplicationTitle")}
        description={t("noApplicationDescription")}
        action={
          <Link href="/me/apply-instructor" className={buttonVariants({ variant: "default" })}>
            {t("noApplicationCta")}
          </Link>
        }
      />
    </div>
  );
}
