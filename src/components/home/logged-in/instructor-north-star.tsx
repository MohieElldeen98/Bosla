import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { InstrumentDial } from "@/components/home/logged-in/instrument-dial";
import { CourseService } from "@/courses/services/course.service";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/auth/types/session";
import type { Locale } from "@/i18n/routing";

/**
 * The instructor's "north star": the dial's big reading is the total
 * course count, and the needle's position is the real in-review share
 * of it (same `CourseService.getMyCourseCounts` call the Instructor
 * Panel's own dashboard already makes) — a genuine ratio, not a
 * decorative sweep, so a heavy review backlog visibly deflects the
 * needle. The published/in-review breakdown beneath spells out what the
 * needle means; the CTA is the one action that matters, into the real
 * panel, not a duplicate of it.
 */
export async function InstructorNorthStar({ user, locale }: { user: AuthUser; locale: Locale }) {
  const [t, counts] = await Promise.all([
    getTranslations({ locale, namespace: "LoggedInHome.instructor" }),
    CourseService.getMyCourseCounts(user),
  ]);

  const total = counts.published + counts.in_review;
  const reviewShare = total > 0 ? counts.in_review / total : 0;

  return (
    <div className="flex flex-col items-center gap-6">
      <InstrumentDial value={reviewShare} reading={String(total)} label={t("totalLabel")} />
      <div className="flex items-center gap-6 rounded-lg px-6 py-3 ring-1 ring-foreground/10">
        <div className="text-center">
          <p className="text-lg font-semibold tabular-nums text-foreground">{counts.published}</p>
          <p className="text-xs text-muted-foreground">{t("publishedLabel")}</p>
        </div>
        <div aria-hidden="true" className="h-8 w-px bg-foreground/15" />
        <div className="text-center">
          <p className="text-lg font-semibold tabular-nums text-foreground">{counts.in_review}</p>
          <p className="text-xs text-muted-foreground">{t("inReviewLabel")}</p>
        </div>
      </div>
      <Link href="/instructor" className={cn(buttonVariants(), "gap-2")}>
        {t("cta")}
        <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
      </Link>
    </div>
  );
}
