import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { InstructorApplicationService } from "@/instructor/services/instructor-application.service";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/**
 * The admin/super-admin "north star": the same pending-applications
 * signal the Admin Panel's own dashboard already surfaces (only shown
 * when > 0 — matches that page's conditional-hint pattern) plus the
 * one CTA into the real panel.
 */
export async function AdminNorthStar({ locale }: { locale: Locale }) {
  const [t, pendingApplications] = await Promise.all([
    getTranslations({ locale, namespace: "LoggedInHome.admin" }),
    InstructorApplicationService.searchResolved({ status: "pending", pageSize: 1 }, locale),
  ]);

  return (
    <div className="flex flex-col items-center gap-4">
      {pendingApplications.total > 0 && (
        <p className="text-sm text-foreground/80">
          {t("pendingApplicationsHint", { count: pendingApplications.total })}
        </p>
      )}
      <Link href="/admin" className={cn(buttonVariants(), "gap-2")}>
        {t("cta")}
        <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
      </Link>
    </div>
  );
}
