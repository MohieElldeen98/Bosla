"use client";

import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import type { ResolvedAdminNavItem } from "@/components/admin/admin-shell.types";

export function Breadcrumb({ items }: { items: ResolvedAdminNavItem[] }) {
  const t = useTranslations("Admin");
  const pathname = usePathname();

  const current =
    pathname === "/admin"
      ? undefined
      : items.find((item) => item.id !== "dashboard" && pathname.startsWith(item.href));

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Link href="/admin" className="hover:text-foreground">
        {t("breadcrumbHome")}
      </Link>
      {current && (
        <>
          <ChevronRight aria-hidden="true" className="size-3.5 rtl:rotate-180" />
          <span aria-current="page" className="font-medium text-foreground">
            {current.label}
          </span>
        </>
      )}
    </nav>
  );
}
