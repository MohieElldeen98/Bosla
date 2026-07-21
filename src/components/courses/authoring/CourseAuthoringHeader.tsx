import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { CompassBezel } from "@/components/brand/CompassBezel";
import { CourseAuthoringNav } from "@/components/courses/authoring/CourseAuthoringNav";

/**
 * The header band shared by the on-site course workspace pages
 * (`/courses/[slug]/edit` · `/curriculum`) — the same muted band, bezel
 * motif, and navbar clearance as `/courses/new`, so authoring an existing
 * course feels like the same room. Renders the course title and the tab
 * nav; each page supplies its own body below.
 */
export async function CourseAuthoringHeader({
  slug,
  courseTitle,
  locale,
}: {
  slug: string;
  courseTitle: string;
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: "CourseCatalog" });

  return (
    <section className="relative overflow-hidden border-b border-border bg-muted/40">
      <CompassBezel className="pointer-events-none absolute -end-24 -top-16 size-80 text-primary/[0.07]" />
      <div className="relative mx-auto max-w-4xl px-6 pt-32 pb-8 lg:px-8">
        <Link
          href={`/courses/${slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
          {t("backToCourses")}
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-primary">
          {t("authoring.manageTitle")}
        </p>
        <h1 className="mt-1 text-balance text-2xl font-bold tracking-tight sm:text-3xl">{courseTitle}</h1>
        <div className="mt-5">
          <CourseAuthoringNav slug={slug} />
        </div>
      </div>
    </section>
  );
}
