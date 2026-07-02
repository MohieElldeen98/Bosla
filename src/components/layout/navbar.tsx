"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Compass, Menu } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getDirection } from "@/i18n/direction";
import type { Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import type { ResolvedCmsNavigationItem } from "@/cms/types/navigation";

export function Navbar({ links }: { links: ResolvedCmsNavigationItem[] }) {
  const t = useTranslations("Navbar");
  const tCommon = useTranslations("Common");
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const sheetSide = getDirection(locale) === "rtl" ? "left" : "right";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        scrolled
          ? "border-b border-border bg-background/80 backdrop-blur-md"
          : "border-b border-transparent bg-white/60 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="size-5" />
          </span>
          <span className="text-lg tracking-tight">
            {tCommon("brandName")}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.id}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher className="text-muted-foreground hover:bg-muted hover:text-foreground" />
          <Button variant="ghost" nativeButton={false} render={<Link href="/sign-in" />}>
            {t("signIn")}
          </Button>
          <Button nativeButton={false} render={<Link href="/sign-up" />}>
            {t("getStarted")}
          </Button>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={<Button variant="ghost" size="icon" className="md:hidden" />}
          >
            <Menu className="size-5" />
            <span className="sr-only">{t("openMenu")}</span>
          </SheetTrigger>
          <SheetContent side={sheetSide} closeLabel={t("closeMenu")}>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Compass className="size-4" />
                </span>
                {tCommon("brandName")}
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4">
              {links.map((link) => (
                <Link
                  key={link.id}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-2 p-4">
              <LanguageSwitcher
                className="w-full justify-center"
                onSelectLocale={() => setOpen(false)}
              />
              <Button variant="outline" nativeButton={false} render={<Link href="/sign-in" />}>
                {t("signIn")}
              </Button>
              <Button nativeButton={false} render={<Link href="/sign-up" />}>
                {t("getStarted")}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
