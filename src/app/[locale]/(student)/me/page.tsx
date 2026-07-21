import { getLocale, getTranslations } from "next-intl/server";
import { Award, Receipt } from "lucide-react";
import { SessionService } from "@/auth/services/session.service";
import { getMyWorkspaceOverviewAction } from "@/learning/actions/workspace-overview.actions";
import { ErrorState } from "@/components/admin/ErrorState";
import { EmptyState } from "@/components/admin/EmptyState";
import { ContinueLearningHero } from "@/components/dashboard/ContinueLearningHero";
import { InstructorApplicationPrompt } from "@/components/dashboard/InstructorApplicationPrompt";
import { WorkspaceStatsRow } from "@/components/workspace/WorkspaceStatsRow";
import { WorkspaceRecentActivity } from "@/components/workspace/WorkspaceRecentActivity";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/** `/me` — the Overview tab (default), the workspace's landing view:
 *  Continue Learning, small learning stats, latest certificate, recent
 *  activity, orders/billing link, and the apply-to-instructor prompt for
 *  students. Deliberately thin on widgets — every section here maps to
 *  something the spec explicitly asked for, nothing added beyond it. */
export default async function WorkspaceOverviewPage() {
  const user = await SessionService.getCurrentUser();
  if (!user) return null;

  const locale = await getLocale();
  const t = await getTranslations("Me.overview");

  const result = await getMyWorkspaceOverviewAction(locale as Locale);
  if (!result.success) {
    return <ErrorState title={t("errorTitle")} description={result.message} />;
  }

  const { continueLearning, stats, latestCertificate, recentActivity } = result.data;

  return (
    <div className="space-y-8">
      <ContinueLearningHero course={continueLearning[0]} />

      <WorkspaceStatsRow stats={stats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("latestCertificateTitle")}</h2>
          <div className="mt-4">
            {latestCertificate ? (
              <Card className="flex items-center justify-between gap-4 p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Award aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{latestCertificate.certificateNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("issued", { date: new Date(latestCertificate.issuedAt).toLocaleDateString(locale) })}
                    </p>
                  </div>
                </div>
                <Link href="/me/certificates" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                  {t("viewAll")}
                </Link>
              </Card>
            ) : (
              <EmptyState
                icon={Award}
                title={t("noCertificatesTitle")}
                description={t("noCertificatesDescription")}
              />
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("recentActivityTitle")}</h2>
          <div className="mt-4">
            <WorkspaceRecentActivity items={recentActivity} locale={locale} />
          </div>
        </div>
      </div>

      <Card className="flex items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Receipt aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">{t("ordersTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("ordersDescription")}</p>
          </div>
        </div>
        <Link href="/me/orders" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          {t("viewOrders")}
        </Link>
      </Card>

      {user.role === "student" && <InstructorApplicationPrompt />}
    </div>
  );
}
