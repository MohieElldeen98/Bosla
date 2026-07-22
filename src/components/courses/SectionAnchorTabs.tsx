"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Mobile-only anchor tabs for the course details page — long single-column
 * pages need a map on phones. Scroll-spied with one IntersectionObserver
 * (the section nearest the top of the viewport wins) rather than scroll
 * listeners, so highlighting costs nothing between intersection changes.
 * Hidden on lg+ where the two-column layout keeps everything reachable.
 */
export function SectionAnchorTabs({
  sections,
  navLabel,
}: {
  sections: { id: string; label: string }[];
  navLabel: string;
}) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const navRef = useRef<HTMLElement>(null);

  // Keeps the active tab in view inside the (horizontally scrollable) strip
  // as the reader scrolls the page — otherwise the highlighted tab drifts
  // off-screen and the strip looks stuck on section 1. One native
  // `scrollIntoView` call per section change (not per scroll frame, that's
  // the IntersectionObserver below), so this costs nothing measurable.
  useEffect(() => {
    const activeLink = navRef.current?.querySelector<HTMLAnchorElement>(
      `a[href="#${CSS.escape(activeId)}"]`,
    );
    activeLink?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeId]);

  useEffect(() => {
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.boundingClientRect.top);
          } else {
            visible.delete(entry.target.id);
          }
        }
        if (visible.size > 0) {
          const [topmost] = [...visible.entries()].sort((a, b) => a[1] - b[1]);
          setActiveId(topmost[0]);
        }
      },
      // The band starts below the sticky chrome and ends mid-viewport, so
      // the "current" section is the one the reader is actually in, not
      // the one whose heading last crossed the very top edge.
      { rootMargin: "-96px 0px -55% 0px" },
    );
    for (const section of sections) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    // `top-[65px]` matches the fixed Navbar's real rendered height exactly
    // (`h-16` = 64px + its `border-b` = 1px, verified against
    // `navbar.tsx`) — `top-14` (56px) left this bar sticking 9px too high,
    // so its top edge sat *under* the (higher z-index) Navbar and clipped
    // the first few pixels of the tab labels instead of sitting flush
    // below it.
    //
    // No hard border below: as the reader free-scrolls (not just when
    // jumping via a tab), every heading passes directly under this bar for
    // an instant — scroll-margin-top (see globals.css) only helps the jump
    // case. A soft drop-shadow instead of a flat line reads as an
    // intentionally layered surface even when a heading is touching it,
    // rather than looking glued.
    <div className="sticky top-[65px] z-20 bg-background/95 shadow-[0_8px_16px_-10px_rgba(0,0,0,0.18)] backdrop-blur lg:hidden">
      <div className="relative mx-auto max-w-7xl">
        <nav
          ref={navRef}
          className="flex gap-5 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label={navLabel}
        >
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              aria-current={activeId === section.id ? "true" : undefined}
              className={cn(
                "whitespace-nowrap border-b-2 py-3 text-sm font-medium transition-colors",
                activeId === section.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {section.label}
            </a>
          ))}
        </nav>
        {/* Edge fades hint there's more to scroll to — the tabs row has no
            other affordance once the native scrollbar is hidden above. */}
        <div className="pointer-events-none absolute inset-y-0 start-0 w-6 bg-gradient-to-r from-background/95 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 end-0 w-6 bg-gradient-to-l from-background/95 to-transparent" />
      </div>
    </div>
  );
}
