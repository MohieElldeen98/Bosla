"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { BoslaIcon } from "@/components/brand/BoslaIcon";

/**
 * Shell for every auth page — soft gradient background matching the
 * homepage Hero's palette (`HeroBackground`), a minimal top bar (brand mark
 * + language switcher, no full site nav), and a centered content area.
 * Pages compose `<AuthCard>` inside this.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  const t = useTranslations("Common");

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 start-0 size-[36rem] rounded-full bg-sky-100/50 blur-[140px]" />
        <div className="absolute -bottom-32 end-0 size-[32rem] rounded-full bg-emerald-100/40 blur-[130px]" />
        <div className="absolute top-1/2 start-1/3 size-[24rem] rounded-full bg-teal-50/40 blur-[120px]" />
      </div>

      <header className="relative z-10 flex h-16 shrink-0 items-center justify-between px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BoslaIcon title="" className="size-5" />
          </span>
          <span className="text-lg tracking-tight">{t("brandName")}</span>
        </Link>
        <LanguageSwitcher />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-12">
        {children}
      </main>
    </div>
  );
}
