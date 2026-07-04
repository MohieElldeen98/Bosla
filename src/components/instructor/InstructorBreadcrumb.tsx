"use client";

import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { useBreadcrumbTrail } from "@/components/layout/breadcrumb-trail";
import { INSTRUCTOR_NAV_ITEMS } from "@/components/instructor/instructor-nav";

/** Mirrors `components/admin/Breadcrumb.tsx` exactly — see its doc
 *  comment for how the trailing (deep-page) segments work. */
export function InstructorBreadcrumb() {
  const t = useTranslations("Instructor.shell");
  const tNav = useTranslations("Instructor.shell.nav");
  const pathname = usePathname();
  const extra = useBreadcrumbTrail();

  const current =
    pathname === "/instructor"
      ? undefined
      : INSTRUCTOR_NAV_ITEMS.find((item) => item.id !== "dashboard" && pathname.startsWith(item.href));

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 overflow-x-auto text-sm text-muted-foreground">
      <Link href="/instructor" className="shrink-0 hover:text-foreground">
        {t("breadcrumbHome")}
      </Link>
      {current && (
        <>
          <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 rtl:rotate-180" />
          {extra.length > 0 ? (
            <Link href={current.href} className="shrink-0 hover:text-foreground">
              {tNav(current.id)}
            </Link>
          ) : (
            <span aria-current="page" className="shrink-0 font-medium text-foreground">
              {tNav(current.id)}
            </span>
          )}
        </>
      )}
      {extra.map((segment, index) => {
        const isLast = index === extra.length - 1;
        return (
          <span key={`${segment.label}-${index}`} className="flex min-w-0 shrink-0 items-center gap-1.5">
            <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 rtl:rotate-180" />
            {segment.href && !isLast ? (
              <Link href={segment.href} className="max-w-40 truncate hover:text-foreground">
                {segment.label}
              </Link>
            ) : (
              <span aria-current={isLast ? "page" : undefined} className="max-w-40 truncate font-medium text-foreground">
                {segment.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
