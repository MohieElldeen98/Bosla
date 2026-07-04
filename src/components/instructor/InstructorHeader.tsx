"use client";

import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { InstructorBreadcrumb } from "@/components/instructor/InstructorBreadcrumb";
import { InstructorUserMenu } from "@/components/instructor/InstructorUserMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import type { AuthUser } from "@/auth/types/session";

/** Mirrors `components/admin/Header.tsx` exactly. */
export function InstructorHeader({ user, onMenuClick }: { user: AuthUser; onMenuClick: () => void }) {
  const t = useTranslations("Instructor.shell");

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background px-4 lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label={t("openMenu")}>
        <Menu className="size-5" />
      </Button>

      <InstructorBreadcrumb />

      <div className="ms-auto flex items-center gap-2">
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/" />}>
          {t("backToSite")}
        </Button>
        <NotificationBell />
        <InstructorUserMenu user={user} />
      </div>
    </header>
  );
}
