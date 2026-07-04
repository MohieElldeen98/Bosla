"use client";

import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/admin/Breadcrumb";
import { UserMenu } from "@/components/admin/UserMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import type { ResolvedAdminNavItem } from "@/components/admin/admin-shell.types";
import type { AuthUser } from "@/auth/types/session";

export function Header({
  user,
  navItems,
  onMenuClick,
}: {
  user: AuthUser;
  navItems: ResolvedAdminNavItem[];
  onMenuClick: () => void;
}) {
  const t = useTranslations("Admin");

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label={t("openMenu")}
      >
        <Menu className="size-5" />
      </Button>

      <Breadcrumb items={navItems} />

      <div className="ms-auto flex items-center gap-2">
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/" />}>
          {t("backToSite")}
        </Button>
        <NotificationBell />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
