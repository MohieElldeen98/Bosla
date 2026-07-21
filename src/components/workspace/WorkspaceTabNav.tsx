"use client";

import { useTranslations } from "next-intl";
import { Award, GraduationCap, LayoutGrid, Settings, User as UserIcon } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/me", key: "overview", icon: LayoutGrid },
  { href: "/me/courses", key: "courses", icon: GraduationCap },
  { href: "/me/certificates", key: "certificates", icon: Award },
  { href: "/me/profile", key: "profile", icon: UserIcon },
  { href: "/me/settings", key: "settings", icon: Settings },
] as const;

/**
 * Route-based tabs, not Base UI `Tabs` (`components/ui/tabs.tsx`) —
 * each tab is a real page with its own server-rendered data and its own
 * `loading.tsx`, so plain `Link`s styled as a tablist (the same
 * `aria-current="page"` pattern GitHub's own repo tabs use) fit better
 * than a client-controlled panel switcher. Active tab is exact-match
 * for `/me` (so Overview isn't "active" on every nested route) and
 * prefix-match for the rest.
 */
export function WorkspaceTabNav() {
  const t = useTranslations("Me.tabs");
  const pathname = usePathname();

  return (
    <nav aria-label={t("navLabel")} className="flex gap-1 overflow-x-auto border-b border-border">
      {TABS.map((tab) => {
        const isActive = tab.href === "/me" ? pathname === "/me" : pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
            {t(tab.key)}
          </Link>
        );
      })}
    </nav>
  );
}
