import { getTranslations } from "next-intl/server";
import { GraduationCap } from "lucide-react";
import { getMyInstructorApplicationAction } from "@/instructor/actions/instructor-application.actions";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * The Learner Workspace's `/me` Overview entry point to
 * `/me/apply-instructor` — only rendered for `role === "student"`
 * (`WorkspaceOverviewPage`'s own check; once approved, the user's role
 * flips to `instructor` and they're routed to `/instructor` instead, so
 * this naturally stops showing). Self-fetches its own application
 * status rather than threading an unrelated Instructor Domain read
 * through `StudentDashboardService`.
 */
export async function InstructorApplicationPrompt() {
  const t = await getTranslations("Instructor.dashboardPrompt");
  const result = await getMyInstructorApplicationAction();
  const application = result.success ? result.data : null;

  const description = !application
    ? t("description")
    : application.status === "pending"
      ? t("pendingDescription")
      : t("rejectedDescription");

  if (application?.status === "approved") return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GraduationCap aria-hidden="true" className="size-4 text-primary" />
          {t("title")}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button size="sm" nativeButton={false} render={<Link href="/me/apply-instructor" />}>
          {application ? t("viewApplication") : t("cta")}
        </Button>
      </CardContent>
    </Card>
  );
}
