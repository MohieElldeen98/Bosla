"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Home, BookOpen, Newspaper, UserRound } from "lucide-react";
import { BoslaLoader } from "@/components/brand/BoslaLoader";
import { UserAvatar } from "@/components/auth/UserAvatar";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { buttonVariants } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { NavbarUserMenu } from "@/components/layout/navbar-user-menu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useSession } from "@/auth/hooks/use-session";
import { getMyProfileAction } from "@/auth/actions/get-my-profile.action";
import { resolveDisplayName } from "@/auth/utils/display-name";
import type { Profile } from "@/auth/types/profile";

gsap.registerPlugin(useGSAP);

/** Icons are mobile-only (the compact icon rail); desktop reads text
 *  labels, same as the identity cluster the icons stand in for. */
const NAV_LINKS = [
  { href: "/", key: "home", icon: Home },
  { href: "/courses", key: "courses", icon: BookOpen },
  { href: "/blog", key: "blog", icon: Newspaper },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The displacement map that gives the glass its "flat and clear in the
 *  middle, bends light only near the rim" look — a flat neutral field
 *  (no displacement) with the distortion baked into a blurred, rounded
 *  inset via SVG gradients, rather than uniform noise across the whole
 *  surface (real glass doesn't warp everything it covers equally).
 *  Technique adapted from the nikdelvin/liquid-glass approach (MIT). */
function buildDisplacementMap(width: number, height: number, radius: number, depth: number) {
  const yFade = Math.ceil((radius / height) * 15);
  const xFade = Math.ceil((radius / width) * 15);
  const svg = `<svg height="${height}" width="${width}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <style>.mix{mix-blend-mode:screen;}</style>
    <defs>
      <linearGradient id="Y" x1="0" x2="0" y1="${yFade}%" y2="${100 - yFade}%">
        <stop offset="0%" stop-color="#0F0"/><stop offset="100%" stop-color="#000"/>
      </linearGradient>
      <linearGradient id="X" x1="${xFade}%" x2="${100 - xFade}%" y1="0" y2="0">
        <stop offset="0%" stop-color="#F00"/><stop offset="100%" stop-color="#000"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" height="${height}" width="${width}" fill="#808080"/>
    <g filter="blur(2px)">
      <rect x="0" y="0" height="${height}" width="${width}" fill="#000080"/>
      <rect x="0" y="0" height="${height}" width="${width}" fill="url(#Y)" class="mix"/>
      <rect x="0" y="0" height="${height}" width="${width}" fill="url(#X)" class="mix"/>
      <rect x="${depth}" y="${depth}" height="${height - 2 * depth}" width="${width - 2 * depth}" fill="#808080" rx="${radius}" ry="${radius}" filter="blur(${depth}px)"/>
    </g>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** The refraction filter: samples `buildDisplacementMap` through
 *  `feImage`, then re-samples the real backdrop three times at slightly
 *  different scales — once per color channel — and recombines with
 *  `feBlend` for a faint chromatic-aberration fringe, the way a real
 *  lens bends red/green/blue by different amounts at the same edge. */
function buildDisplacementFilter(opts: {
  width: number;
  height: number;
  radius: number;
  depth: number;
  strength: number;
  chromaticAberration: number;
}) {
  const { width, height, radius, depth, strength, chromaticAberration: ca } = opts;
  const map = buildDisplacementMap(width, height, radius, depth);
  const svg = `<svg height="${height}" width="${width}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="displace" color-interpolation-filters="sRGB">
        <feImage x="0" y="0" height="${height}" width="${width}" href="${map}" result="displacementMap"/>
        <feDisplacementMap in="SourceGraphic" in2="displacementMap" scale="${strength + ca * 2}" xChannelSelector="R" yChannelSelector="G"/>
        <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="displacedR"/>
        <feDisplacementMap in="SourceGraphic" in2="displacementMap" scale="${strength + ca}" xChannelSelector="R" yChannelSelector="G"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="displacedG"/>
        <feDisplacementMap in="SourceGraphic" in2="displacementMap" scale="${strength}" xChannelSelector="R" yChannelSelector="G"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="displacedB"/>
        <feBlend in="displacedR" in2="displacedG" mode="screen"/>
        <feBlend in2="displacedB" mode="screen"/>
      </filter>
    </defs>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}#displace`;
}

/** Chromium-only, capable-device-only progressive enhancement for
 *  `.nav-glass` (see globals.css) — regenerates the refraction filter to
 *  match the pill's own live size via `ResizeObserver`, debounced.
 *  Gated in JS rather than a bare `@supports` check because the 3-pass
 *  filter above re-samples the moving backdrop every scrolled frame:
 *  fine on a desktop GPU, real jank on a mid-range phone, which this
 *  global, every-page nav can't afford — `matchMedia("(pointer: fine)")`
 *  opts out of exactly that case (touch devices report `coarse`, not
 *  `fine`). Deliberately NOT also gated on viewport width: an earlier
 *  version required `min-width: 1024px` too, reasoning "narrow viewport
 *  → weaker device" — backwards. The filter's cost scales with the pill
 *  element's own size (proportional to viewport width), so a narrower
 *  desktop window means a *smaller* surface to filter, if anything
 *  cheaper to render, not riskier; the width check only ever excluded
 *  legitimate desktop browser windows that simply weren't maximized,
 *  which is a real, common case, not an edge one. Everywhere this
 *  doesn't apply, `.nav-glass`'s plain blur+saturate is the complete
 *  design, not a degraded one.
 *
 *  Returns whether the effect is active — the caller folds this into its
 *  own `cn(...)` className, it is never toggled via `classList` directly.
 *  That distinction is load-bearing: this component's `scrolled`/
 *  `overDark`/`hidden` state all change on scroll, so Navbar re-renders
 *  on virtually every scroll tick, and every re-render sets this div's
 *  whole `className` from React's own computed string. A class added
 *  imperatively (`node.classList.add(...)`) has no representation in
 *  that string, so the very next scroll-driven re-render silently wipes
 *  it — the glass would work for a moment after mount, then permanently
 *  drop to the plain fallback on the first scroll. `--lg-filter` doesn't
 *  have this problem only because the div has no `style` prop in JSX for
 *  React to reconcile in the first place. */
function useLiquidGlass(ref: React.RefObject<HTMLElement | null>) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node: HTMLElement | null = ref.current;
    if (!node) return;

    const supportsUrlFilter = typeof CSS !== "undefined" && CSS.supports?.("backdrop-filter", "url(#a)");
    const capableDevice = typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
    if (!supportsUrlFilter || !capableDevice) return;

    let pending: ReturnType<typeof setTimeout> | null = null;
    const apply = () => {
      pending = null;
      const { offsetWidth: w, offsetHeight: h } = node;
      if (!w || !h) return;
      const filter = `url("${buildDisplacementFilter({
        width: w,
        height: h,
        radius: h / 2,
        depth: 8,
        strength: 60,
        chromaticAberration: 4,
      })}") blur(1px) saturate(160%)`;
      node.style.setProperty("--lg-filter", filter);
      setActive(true);
    };
    const schedule = () => {
      if (pending) clearTimeout(pending);
      pending = setTimeout(apply, 120);
    };

    const observer = new ResizeObserver(schedule);
    observer.observe(node);
    apply();

    return () => {
      observer.disconnect();
      if (pending) clearTimeout(pending);
      setActive(false);
      node.style.removeProperty("--lg-filter");
    };
  }, [ref]);

  return active;
}

/**
 * One sliding indicator per rail (desktop text rail, mobile icon rail) —
 * glides to whatever is hovered/focused and springs back to the current
 * route on pointer-leave/blur, mirroring the exact "seek, overshoot,
 * settle" vocabulary `BoslaLoader`/`CompassMark`/`BoslaProgress` already
 * share (DESIGN.md's Signature Component family): this indicator is that
 * family's 4th member, not a new one-off effect. Position/width come from
 * live `getBoundingClientRect()` math (never CSS `left`/logical insets),
 * so it's correct in both LTR and RTL without direction-specific branches.
 */
function useSlidingIndicator(pathname: string) {
  const railRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const hasMounted = useRef(false);

  const moveTo = useCallback((el: HTMLElement | null, instant = false) => {
    const rail = railRef.current;
    const indicator = indicatorRef.current;
    if (!indicator || !rail) return;
    if (!el) {
      gsap.to(indicator, { autoAlpha: 0, duration: 0.2, overwrite: "auto" });
      return;
    }
    const elRect = el.getBoundingClientRect();
    const railRect = rail.getBoundingClientRect();
    gsap.to(indicator, {
      autoAlpha: 1,
      x: elRect.left - railRect.left,
      width: elRect.width,
      duration: instant ? 0 : 0.5,
      ease: instant ? "none" : "back.out(1.7)",
      overwrite: "auto",
    });
  }, []);

  const resetToActive = useCallback(
    (instant = false) => {
      const activeEl = railRef.current?.querySelector<HTMLElement>("[data-nav-active]") ?? null;
      moveTo(activeEl, instant);
    },
    [moveTo],
  );

  useEffect(() => {
    resetToActive(!hasMounted.current);
    hasMounted.current = true;
  }, [pathname, resetToActive]);

  useEffect(() => {
    function onResize() {
      resetToActive(true);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [resetToActive]);

  return { railRef, indicatorRef, moveTo, resetToActive };
}

/** Desktop text link — the magnetic pull (mouse + motion-allowed only,
 *  `gsap.matchMedia` gates both) lives on the wrapping `<span>`, not the
 *  `<Link>` itself, so the indicator's own rect math (read from that same
 *  span) always reflects where the label actually is, pull included. */
function NavLinkItem({
  href,
  active,
  onActivate,
  onDeactivate,
  children,
}: {
  href: string;
  active: boolean;
  onActivate: (el: HTMLElement) => void;
  onDeactivate: () => void;
  children: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const quick = useRef<{ x: (v: number) => void; y: (v: number) => void } | null>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference) and (pointer: fine)", () => {
        if (!wrapRef.current) return () => {};
        quick.current = {
          x: gsap.quickTo(wrapRef.current, "x", { duration: 0.35, ease: "power3.out" }),
          y: gsap.quickTo(wrapRef.current, "y", { duration: 0.35, ease: "power3.out" }),
        };
        return () => {
          quick.current = null;
        };
      });
      return () => mm.revert();
    },
    { scope: wrapRef },
  );

  function handleEnter() {
    if (wrapRef.current) onActivate(wrapRef.current);
  }
  function handlePointerMove(e: React.PointerEvent<HTMLSpanElement>) {
    if (!quick.current || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    quick.current.x((e.clientX - rect.left - rect.width / 2) * 0.35);
    quick.current.y((e.clientY - rect.top - rect.height / 2) * 0.4);
  }
  function handleLeave() {
    if (wrapRef.current) gsap.to(wrapRef.current, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.5)" });
    onDeactivate();
  }

  return (
    <span
      ref={wrapRef}
      data-nav-active={active ? "true" : undefined}
      className="relative inline-block"
      onPointerEnter={handleEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handleLeave}
    >
      <Link
        href={href}
        onFocus={handleEnter}
        onBlur={onDeactivate}
        className={cn(
          "relative z-10 block rounded-full px-3.5 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {children}
      </Link>
    </span>
  );
}

/** Mobile icon link — same indicator contract as `NavLinkItem`, no
 *  magnetic pull (imprecise under touch, and these are fixed-size icon
 *  targets rather than variable-width text). */
function MobileNavIcon({
  href,
  active,
  label,
  icon: Icon,
  onActivate,
  onDeactivate,
}: {
  href: string;
  active: boolean;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  onActivate: (el: HTMLElement) => void;
  onDeactivate: () => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  function handleEnter() {
    if (ref.current) onActivate(ref.current);
  }
  return (
    <span
      ref={ref}
      data-nav-active={active ? "true" : undefined}
      className="relative inline-flex"
      onPointerEnter={handleEnter}
      onPointerLeave={onDeactivate}
    >
      <Link
        href={href}
        aria-label={label}
        onFocus={handleEnter}
        onBlur={onDeactivate}
        className={cn(
          "relative z-10 flex size-10 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <Icon aria-hidden className="size-5" />
      </Link>
    </span>
  );
}

/**
 * The site's global chrome — a floating glass pill, inset from the
 * viewport rather than a full-width bar, adaptive to whatever section
 * currently sits behind it (reusing the same local `.dark`-scoping
 * technique as the Hero/Problem atmosphere: `section.dark` under the
 * header's midpoint flips the header into `.dark` too, so it reads
 * correctly over both the night-sky Hero and daylight sections with zero
 * new colors). Recedes on scroll-down past the fold and returns on
 * scroll-up or on focus, so it never competes with a page's content but
 * is never more than one scroll-tick away.
 *
 * Deliberately stays at a *fixed* height and shape across scroll states
 * (only glass/shadow intensity change) rather than shrinking — this is
 * global chrome that also has to work as calm, reliable navigation on
 * Operate-mode pages (courses, blog), not just the homepage's story; a
 * shape-morphing bar would fight that. The one authored motion moment is
 * the sliding indicator (see `useSlidingIndicator`) plus a restrained
 * magnetic pull on desktop links — everything else holds still.
 *
 * Mobile deliberately has no hamburger/side-drawer: primary links are
 * compact icons in the same pill, and a "more" trigger opens a bottom
 * sheet for secondary items (auth, language, notifications). This also
 * sidesteps a real layout constraint — `MobilePurchaseBar` already owns
 * the fixed-bottom edge on course detail pages, so nothing here competes
 * with it for that space.
 */
export function Navbar() {
  const t = useTranslations("Navbar");
  const tCommon = useTranslations("Common");
  const pathname = usePathname();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [overDark, setOverDark] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const headerRef = useRef<HTMLElement>(null);

  const { user } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  const desktopIndicator = useSlidingIndicator(pathname);
  const mobileIndicator = useSlidingIndicator(pathname);
  const glassRef = useRef<HTMLDivElement>(null);
  const liquidGlassActive = useLiquidGlass(glassRef);

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
      const y = window.scrollY;
      setScrolled(y > 40);

      const headerMidY = 40;
      const dark = Array.from(document.querySelectorAll<HTMLElement>("section.dark")).some((el) => {
        const rect = el.getBoundingClientRect();
        return rect.top <= headerMidY && rect.bottom >= headerMidY;
      });
      setOverDark(dark);

      const delta = y - lastScrollY.current;
      if (y < 140) {
        setHidden(false);
      } else if (Math.abs(delta) > 6) {
        setHidden(delta > 0);
      }
      lastScrollY.current = y;
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /** Hide/reveal is a GSAP tween on `headerRef`, not a Tailwind
   *  `transition-` class + conditional `-translate-y-*`. `scrolled`/
   *  `overDark`/`hidden` all update from the same scroll handler, so this
   *  component can re-render many times a second while scrolling — a pure
   *  CSS transition has to survive that many `className` recomputations in
   *  a row, and this component has already hit one bug this session where
   *  rapid re-renders quietly broke a CSS-driven effect (see
   *  `useLiquidGlass`'s doc comment). Animating imperatively via GSAP
   *  sidesteps the question entirely: the tween owns `transform` outright,
   *  independent of whatever else changes in the same render. Exit/enter
   *  use different eases (accelerate away, decelerate in) rather than one
   *  symmetric curve — the small asymmetry is what reads as an authored
   *  motion instead of a mechanical toggle. */
  useGSAP(
    () => {
      if (!headerRef.current) return;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.to(headerRef.current, {
        yPercent: hidden ? -100 : 0,
        y: hidden ? -24 : 0,
        duration: reduceMotion ? 0 : 0.4,
        ease: hidden ? "power2.in" : "power3.out",
        overwrite: "auto",
      });
    },
    { dependencies: [hidden], scope: headerRef },
  );

  const canWriteArticles = !!user && ["instructor", "admin", "super_admin"].includes(user.role);
  const navItems = canWriteArticles ? [...NAV_LINKS, { href: "/blog/my", key: "myArticles" as const }] : NAV_LINKS;
  const displayName = user ? resolveDisplayName(profile, user) : "";

  return (
    <>
      <header
        ref={headerRef}
        onFocusCapture={() => setHidden(false)}
        className={cn(
          "fixed inset-x-3 top-3 z-40 sm:inset-x-4 sm:top-4 lg:inset-x-6 lg:top-5",
          "transition-[background-color,border-color,box-shadow] duration-300 ease-out",
          overDark && "dark",
        )}
      >
        <div
          ref={glassRef}
          className={cn(
            "nav-glass relative mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 rounded-full border px-3 sm:px-4",
            scrolled && "is-scrolled",
            liquidGlassActive && "lg-active",
          )}
        >
          <Link
            href="/"
            className="relative z-10 flex shrink-0 items-center gap-2 rounded-full font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <BoslaLoader label="" ring="strong" className="size-6" />
            </span>
            <span className="hidden text-base tracking-tight sm:inline">{tCommon("brandName")}</span>
          </Link>

          {/* Desktop nav rail — absolutely centered so it stays dead-center
              regardless of how wide the brand/actions clusters are. */}
          <div
            ref={desktopIndicator.railRef}
            className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex"
          >
            <span
              ref={desktopIndicator.indicatorRef}
              aria-hidden="true"
              className="absolute left-0 top-1 h-[calc(100%-0.5rem)] rounded-full bg-primary/10 opacity-0 ring-1 ring-primary/15"
            />
            {navItems.map((item) => (
              <NavLinkItem
                key={item.key}
                href={item.href}
                active={isActivePath(pathname, item.href)}
                onActivate={desktopIndicator.moveTo}
                onDeactivate={() => desktopIndicator.resetToActive()}
              >
                {t(item.key)}
              </NavLinkItem>
            ))}
          </div>

          <div className="hidden items-center gap-1 md:flex">
            <LanguageSwitcher className="text-muted-foreground hover:bg-muted hover:text-foreground" />
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
              <div className="flex items-center gap-2">
                <Link href="/sign-in" className={cn(buttonVariants({ variant: "ghost" }))}>
                  {t("signIn")}
                </Link>
                <Link href="/sign-up" className={cn(buttonVariants())}>
                  {t("getStarted")}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile: compact icon rail stands in for the whole nav +
              actions cluster; "more" opens the bottom sheet below. */}
          <div ref={mobileIndicator.railRef} className="relative flex items-center gap-0.5 md:hidden">
            <span
              ref={mobileIndicator.indicatorRef}
              aria-hidden="true"
              className="absolute left-0 top-0 size-10 rounded-full bg-primary/10 opacity-0 ring-1 ring-primary/15"
            />
            {NAV_LINKS.map((item) => (
              <MobileNavIcon
                key={item.key}
                href={item.href}
                active={isActivePath(pathname, item.href)}
                label={t(item.key)}
                icon={item.icon}
                onActivate={mobileIndicator.moveTo}
                onDeactivate={() => mobileIndicator.resetToActive()}
              />
            ))}
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-label={t("more")}
              className="relative z-10 flex size-10 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {user ? (
                <UserAvatar name={displayName} avatarUrl={profile?.avatarUrl ?? null} className="size-7" />
              ) : (
                <UserRound aria-hidden className="size-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" closeLabel={t("closeMenu")} className="mx-auto max-w-md rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <BoslaLoader label="" ring="strong" className="size-5" />
              </span>
              {tCommon("brandName")}
            </SheetTitle>
          </SheetHeader>
          {canWriteArticles && (
            <div className="px-4">
              <Link
                href="/blog/my"
                onClick={() => setSheetOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {t("myArticles")}
              </Link>
            </div>
          )}
          <SheetFooter style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
            <LanguageSwitcher className="w-full justify-center" onSelectLocale={() => setSheetOpen(false)} />
            {user ? (
              <div className="flex items-center gap-2">
                <NotificationBell />
                <NavbarUserMenu
                  user={user}
                  profile={profile}
                  isProfileLoading={isProfileLoading}
                  onNavigate={() => setSheetOpen(false)}
                  triggerClassName="min-w-0 flex-1 justify-start"
                />
              </div>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  onClick={() => setSheetOpen(false)}
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  {t("signIn")}
                </Link>
                <Link href="/sign-up" onClick={() => setSheetOpen(false)} className={cn(buttonVariants())}>
                  {t("getStarted")}
                </Link>
              </>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
