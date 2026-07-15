"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { getDirection } from "@/i18n/direction";
import type { Locale } from "@/i18n/routing";
import { SidebarItem } from "@/components/admin/SidebarItem";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { INSTRUCTOR_NAV_ITEMS } from "@/components/instructor/instructor-nav";
import { BoslaIcon } from "@/components/brand/BoslaIcon";

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const t = useTranslations("Instructor.shell.nav");
  return (
    <nav aria-label="Instructor" className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
      {INSTRUCTOR_NAV_ITEMS.map((item) => (
        <SidebarItem
          key={item.id}
          href={item.href}
          label={t(item.id)}
          icon={item.icon}
          active={item.id === "dashboard" ? pathname === "/instructor" : pathname.startsWith(item.href)}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

/**
 * The Instructor Panel's persistent navigation — mirrors
 * `components/admin/Sidebar.tsx` exactly. Before this, `(instructor)`
 * pages had no shell at all: no way to move between My Courses/Students/
 * Coupons/Earnings/Profile except the `/instructor` dashboard's own card
 * grid, and no sign-out once you'd navigated away from it.
 */
export function InstructorSidebar({
  mobileOpen,
  onMobileOpenChange,
}: {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Instructor.shell");
  const pathname = usePathname();
  const locale = useLocale() as Locale;
  const sheetSide = getDirection(locale) === "rtl" ? "right" : "left";

  return (
    <>
      {/* Desktop — persistent */}
      <aside className="hidden w-64 shrink-0 flex-col border-e border-border bg-card lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <Link href="/instructor" className="flex items-center gap-2 font-semibold text-foreground">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BoslaIcon title="" className="size-5" />
            </span>
            <span className="text-base tracking-tight">
              Bosla <span className="text-muted-foreground">{t("brandSuffix")}</span>
            </span>
          </Link>
        </div>
        <SidebarNav pathname={pathname} />
      </aside>

      {/* Mobile — sheet */}
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side={sheetSide} closeLabel={t("closeMenu")}>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <BoslaIcon title="" className="size-4" />
              </span>
              Bosla <span className="text-muted-foreground">{t("brandSuffix")}</span>
            </SheetTitle>
          </SheetHeader>
          <SidebarNav pathname={pathname} onNavigate={() => onMobileOpenChange(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
