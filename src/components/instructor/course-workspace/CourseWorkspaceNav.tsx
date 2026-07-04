"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * The Course Workspace's tab bar — once an Instructor opens a specific
 * course, every related surface (Overview/edit form, Curriculum,
 * Students, Coupons) stays reachable from right here instead of forcing
 * a trip back to a global, unfiltered list and a manual scan for the
 * right row (the exact gap the Bosla UX audit flagged as the single
 * biggest Instructor IA problem). Each tab is a real route — not a
 * client-side panel switch — so every one of these screens keeps its own
 * URL, its own server-rendered data fetch, and its own refresh/back-
 * button behavior; this is only the active-state styling layered on top,
 * visually matching `ui/tabs.tsx`'s pill style so it doesn't look like a
 * new pattern.
 */
export function CourseWorkspaceNav({ courseId }: { courseId: string }) {
  const t = useTranslations("Instructor.workspace");
  const pathname = usePathname();

  const tabs = [
    { id: "overview", href: `/instructor/courses/${courseId}/edit` },
    { id: "curriculum", href: `/instructor/courses/${courseId}/curriculum` },
    { id: "students", href: `/instructor/courses/${courseId}/students` },
    { id: "coupons", href: `/instructor/courses/${courseId}/coupons` },
  ] as const;

  return (
    <div className="flex w-fit items-center gap-1 overflow-x-auto rounded-lg bg-muted p-1 text-muted-foreground">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-7 shrink-0 items-center justify-center whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors",
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
