"use client";

import { useState, type ReactNode } from "react";
import { useLocale } from "next-intl";
import { Toaster } from "sonner";
import { InstructorSidebar } from "@/components/instructor/InstructorSidebar";
import { InstructorHeader } from "@/components/instructor/InstructorHeader";
import { BreadcrumbTrailProvider } from "@/components/layout/breadcrumb-trail";
import { getDirection } from "@/i18n/direction";
import type { Locale } from "@/i18n/routing";
import type { AuthUser } from "@/auth/types/session";

/**
 * The Instructor Panel shell — mirrors `components/admin/AdminChrome.tsx`
 * exactly (sidebar, header, breadcrumb, content area, toaster). Every
 * `(instructor)/*` page already owns its own inner padding/max-width
 * (built before this shell existed), so `<main>` here deliberately adds
 * none — wrapping existing pages in real navigation without touching
 * their own layout.
 */
export function InstructorChrome({ user, children }: { user: AuthUser; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const locale = useLocale() as Locale;

  return (
    <BreadcrumbTrailProvider>
      <div className="flex min-h-screen bg-muted/30">
        <InstructorSidebar mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />
        <div className="flex min-w-0 flex-1 flex-col">
          <InstructorHeader user={user} onMenuClick={() => setMobileOpen(true)} />
          <main className="flex-1">{children}</main>
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
