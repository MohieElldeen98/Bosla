"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { getDirection } from "@/i18n/direction";
import type { Locale } from "@/i18n/routing";
import { SidebarItem } from "@/components/admin/SidebarItem";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ADMIN_NAV_ITEMS } from "@/components/admin/admin-nav";
import type { ResolvedAdminNavItem } from "@/components/admin/admin-shell.types";
import { BoslaIcon } from "@/components/brand/BoslaIcon";

/** Groups the already-ordered flat `items` list into consecutive runs by
 *  `group` — `ADMIN_NAV_ITEMS`' own declaration order already places every
 *  group's items together, so this never needs to sort, just partition. */
function groupItems(items: ResolvedAdminNavItem[]): { group: string; groupLabel: string; items: ResolvedAdminNavItem[] }[] {
  const sections: { group: string; groupLabel: string; items: ResolvedAdminNavItem[] }[] = [];
  for (const item of items) {
    const last = sections[sections.length - 1];
    if (last && last.group === item.group) {
      last.items.push(item);
    } else {
      sections.push({ group: item.group, groupLabel: item.groupLabel, items: [item] });
    }
  }
  return sections;
}

function SidebarNav({
  items,
  pathname,
  comingSoonLabel,
  onNavigate,
}: {
  items: ResolvedAdminNavItem[];
  pathname: string;
  comingSoonLabel: string;
  onNavigate?: () => void;
}) {
  const sections = groupItems(items);

  return (
    <nav aria-label="Admin" className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
      {sections.map((section) => (
        <div key={section.group} className="flex flex-col gap-1">
          {section.group !== "overview" && (
            <span className="px-3 pb-1 text-xs font-semibold tracking-wide text-muted-foreground/80 uppercase">
              {section.groupLabel}
            </span>
          )}
          {section.items.map((item) => {
            const icon = ADMIN_NAV_ITEMS.find((navItem) => navItem.id === item.id)?.icon;
            if (!icon) return null;
            return (
              <SidebarItem
                key={item.id}
                href={item.href}
                label={item.label}
                icon={icon}
                active={
                  item.id === "dashboard" ? pathname === "/admin" : pathname.startsWith(item.href)
                }
                comingSoon={item.comingSoon}
                comingSoonLabel={comingSoonLabel}
                onNavigate={onNavigate}
              />
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function Sidebar({
  items,
  mobileOpen,
  onMobileOpenChange,
}: {
  items: ResolvedAdminNavItem[];
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Admin");
  const pathname = usePathname();
  const locale = useLocale() as Locale;
  const sheetSide = getDirection(locale) === "rtl" ? "right" : "left";

  return (
    <>
      {/* Desktop — persistent */}
      <aside className="hidden w-64 shrink-0 flex-col border-e border-border bg-card lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <Link href="/admin" className="flex items-center gap-2 font-semibold text-foreground">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BoslaIcon title="" className="size-5" />
            </span>
            <span className="text-base tracking-tight">
              Bosla <span className="text-muted-foreground">{t("brandSuffix")}</span>
            </span>
          </Link>
        </div>
        <SidebarNav items={items} pathname={pathname} comingSoonLabel={t("nav.comingSoon")} />
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
          <SidebarNav
            items={items}
            pathname={pathname}
            comingSoonLabel={t("nav.comingSoon")}
            onNavigate={() => onMobileOpenChange(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
