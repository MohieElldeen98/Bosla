"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { BoslaLoader } from "@/components/brand/BoslaLoader";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getDirection } from "@/i18n/direction";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { NavbarUserMenu } from "@/components/layout/navbar-user-menu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useSession } from "@/auth/hooks/use-session";
import { getMyProfileAction } from "@/auth/actions/get-my-profile.action";
import type { Profile } from "@/auth/types/profile";

const NAV_LINKS = [
  { href: "/", key: "home" },
  { href: "/courses", key: "courses" },
  { href: "/blog", key: "blog" },
] as const;

export function Navbar() {
  const t = useTranslations("Navbar");
  const tCommon = useTranslations("Common");
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Read client-side, not passed down as a prop from `page.tsx` — the
  // homepage is statically rendered + ISR-revalidated (`export const
  // revalidate = 60` above), and a server-side session read (any `cookies()`
  // call) would force that whole route into per-request dynamic rendering.
  // `useSession()` already exists precisely for this — see its own doc
  // comment ("e.g. a future navbar avatar menu") — and its
  // `onAuthStateChange` subscription is also what makes the menu swap
  // immediately on sign-out without a full reload.
  const { user } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  // Only gates the *name text* inside the identity cluster (a skeleton bar
  // while true) — the cluster itself is never hidden on this flag, see
  // `NavbarUserMenu`'s `isProfileLoading` prop.
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setIsProfileLoading(false);
      return;
    }
    let cancelled = false;
    setIsProfileLoading(true);
    getMyProfileAction().then((result) => {
      if (!cancelled) {
        setProfile(result);
        setIsProfileLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // `SheetContent`'s `side` is physical ("left" | "right"), not logical
  // ("start"/"end" isn't a valid value), so the RTL mirroring has to be
  // computed manually.
  const sheetSide = getDirection(locale) === "rtl" ? "left" : "right";

  // Author-only navbar entry — read from the session's own JWT role
  // (`AuthUser.role`), NOT the separately-fetched profile: the profile
  // needs an extra server-action round-trip and made this link pop in a
  // second late. The /blog/my page re-checks server-side regardless.
  const canWriteArticles =
    !!user && ["instructor", "admin", "super_admin"].includes(user.role);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        scrolled
          ? "border-b border-border bg-background/80 backdrop-blur-md"
          : "border-b border-transparent bg-white/60 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto flex h-16 w-full items-center justify-between px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
          <span className="flex size-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <BoslaLoader label="" ring="strong" className="size-7" />
          </span>
          <span className="text-lg tracking-tight">{tCommon("brandName")}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {t(link.key)}
            </Link>
          ))}
          {canWriteArticles && (
            <Link
              href="/blog/my"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {t("myArticles")}
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher className="text-muted-foreground hover:bg-muted hover:text-foreground" />
          {/* Renders from the current `user` value immediately — no
              loading-gated fade. `user` starts `null` (see `useSession()`)
              so guests see their buttons right away instead of a blank
              gap; once the session resolves for a signed-in visitor this
              swaps straight to the identity cluster, no hidden interval. */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <NotificationBell />
                <NavbarUserMenu
                  user={user}
                  profile={profile}
                  isProfileLoading={isProfileLoading}
                  triggerClassName="text-foreground"
                />
              </>
            ) : (
              <>
                <Link href="/sign-in" className={cn(buttonVariants({ variant: "ghost" }))}>
                  {t("signIn")}
                </Link>
                <Link href="/sign-up" className={cn(buttonVariants())}>
                  {t("getStarted")}
                </Link>
              </>
            )}
          </div>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side={sheetSide} closeLabel={t("closeMenu")}>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <BoslaLoader label="" ring="strong" className="size-6" />
                </span>
                {tCommon("brandName")}
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto">
              <nav className="flex flex-col gap-1 px-4">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.key}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {t(link.key)}
                  </Link>
                ))}
                {canWriteArticles && (
                  <Link
                    href="/blog/my"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {t("myArticles")}
                  </Link>
                )}
              </nav>
            </div>
            <SheetFooter>
              <LanguageSwitcher className="w-full justify-center" onSelectLocale={() => setOpen(false)} />
              {user ? (
                <div className="flex items-center gap-2">
                  <NotificationBell />
                  <NavbarUserMenu
                    user={user}
                    profile={profile}
                    isProfileLoading={isProfileLoading}
                    onNavigate={() => setOpen(false)}
                  />
                </div>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    onClick={() => setOpen(false)}
                    className={cn(buttonVariants({ variant: "outline" }))}
                  >
                    {t("signIn")}
                  </Link>
                  <Link href="/sign-up" onClick={() => setOpen(false)} className={cn(buttonVariants())}>
                    {t("getStarted")}
                  </Link>
                </>
              )}
            </SheetFooter>
          </SheetContent>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="md:hidden" />
            }
          >
            <Menu className="size-5" />
            <span className="sr-only">{t("openMenu")}</span>
          </SheetTrigger>
        </Sheet>
      </div>
    </header>
  );
}
