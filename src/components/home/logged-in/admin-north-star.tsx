import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { InstrumentDial } from "@/components/home/logged-in/instrument-dial";
import { InstructorApplicationService } from "@/instructor/services/instructor-application.service";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/**
 * The admin/super-admin "north star": the same pending-applications
 * signal the Admin Panel's own dashboard already surfaces, read as an
 * annunciator — the needle rests at zero when the queue is clear and
 * deflects once anything is pending (scaled against a soft ceiling of
 * 10 purely for the needle's sweep, not a business rule) so "nothing
 * needs you" and "something needs you" are visibly different states,
 * not just different numbers. The hint line (matches the Admin Panel's
 * own conditional-hint pattern) and CTA are unchanged.
 */
export async function AdminNorthStar({ locale }: { locale: Locale }) {
  const [t, pendingApplications] = await Promise.all([
    getTranslations({ locale, namespace: "LoggedInHome.admin" }),
    InstructorApplicationService.searchResolved({ status: "pending", pageSize: 1 }, locale),
  ]);

  const pending = pendingApplications.total;
  const dialValue = pending > 0 ? Math.min(pending / 10, 1) : 0;

  return (
    <div className="flex flex-col items-center gap-6">
      <InstrumentDial value={dialValue} reading={String(pending)} label={t("pendingLabel")} />
      {pending > 0 && (
        <p className="text-sm text-foreground/80">{t("pendingApplicationsHint", { count: pending })}</p>
      )}
      <Link href="/admin" className={cn(buttonVariants(), "gap-2")}>
        {t("cta")}
        <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
      </Link>
    </div>
  );
}
