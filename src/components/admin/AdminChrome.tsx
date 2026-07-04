"use client";

import { useState, type ReactNode } from "react";
import { useLocale } from "next-intl";
import { Toaster } from "sonner";
import { Sidebar } from "@/components/admin/Sidebar";
import { Header } from "@/components/admin/Header";
import { BreadcrumbTrailProvider } from "@/components/layout/breadcrumb-trail";
import { getDirection } from "@/i18n/direction";
import type { Locale } from "@/i18n/routing";
import type { ResolvedAdminNavItem } from "@/components/admin/admin-shell.types";
import type { AuthUser } from "@/auth/types/session";

export function AdminChrome({
  user,
  navItems,
  children,
}: {
  user: AuthUser;
  navItems: ResolvedAdminNavItem[];
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const locale = useLocale() as Locale;

  return (
    <BreadcrumbTrailProvider>
      <div className="flex min-h-screen bg-muted/30">
        <Sidebar items={navItems} mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header user={user} navItems={navItems} onMenuClick={() => setMobileOpen(true)} />
          <main className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">{children}</div>
          </main>
        </div>
        <Toaster
          dir={getDirection(locale)}
          position={getDirection(locale) === "rtl" ? "top-left" : "top-right"}
          richColors
          closeButton
        />
      </div>
    </BreadcrumbTrailProvider>
  );
}
