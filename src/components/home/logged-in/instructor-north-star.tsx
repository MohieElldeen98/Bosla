import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { CourseService } from "@/courses/services/course.service";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/auth/types/session";
import type { Locale } from "@/i18n/routing";

/**
 * The instructor's "north star": a compact published/in-review snapshot
 * (same `CourseService.getMyCourseCounts` call the Instructor Panel's
 * own dashboard already makes) plus the one CTA that matters — into the
 * real panel, not a duplicate of it.
 */
export async function InstructorNorthStar({ user, locale }: { user: AuthUser; locale: Locale }) {
  const [t, counts] = await Promise.all([
    getTranslations({ locale, namespace: "LoggedInHome.instructor" }),
    CourseService.getMyCourseCounts(user),
  ]);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-6">
        <div className="text-center">
          <p className="text-2xl font-semibold text-foreground">{counts.published}</p>
          <p className="text-xs text-muted-foreground">{t("publishedLabel")}</p>
        </div>
        <div aria-hidden="true" className="h-8 w-px bg-foreground/15" />
        <div className="text-center">
          <p className="text-2xl font-semibold text-foreground">{counts.in_review}</p>
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
