"use client";

import { useEffect, useState } from "react";
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
    <div className="sticky top-14 z-20 border-b border-border bg-background/95 px-6 backdrop-blur lg:hidden">
      <nav className="mx-auto flex max-w-7xl gap-6 overflow-x-auto" aria-label={navLabel}>
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
    </div>
  );
}
