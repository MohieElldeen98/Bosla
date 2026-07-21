"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * The on-site course workspace's tab bar — the public-chrome equivalent of
 * the instructor panel's `CourseWorkspaceNav`, but slug-based so it lives
 * on the normal site (`/courses/[slug]/edit` · `/courses/[slug]/curriculum`)
 * instead of a dashboard. Anyone with authority over the course (its own
 * instructor, or any manager) authors it here, no panel required. Each tab
 * is a real route; this is only the active-state styling on top.
 */
export function CourseAuthoringNav({ slug }: { slug: string }) {
  const t = useTranslations("CourseCatalog.authoring");
  const pathname = usePathname();

  const tabs = [
    { id: "infoTab", href: `/courses/${slug}/edit` },
    { id: "curriculumTab", href: `/courses/${slug}/curriculum` },
  ] as const;

  return (
    <div className="flex w-fit items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-md px-4 text-sm font-medium transition-colors",
              active ? "bg-background text-foreground shadow-sm" : "hover:text-foreground",
            )}
          >
            {t(tab.id)}
          </Link>
        );
      })}
    </div>
  );
}
