"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { LegalTocEntry } from "@/cms/utils/legal-toc";

/**
 * The desktop sticky Table of Contents for a legal document
 * (docs/legal-content-platform.md §Page Design). Same scroll-spy
 * approach as `SectionAnchorTabs` (one shared `IntersectionObserver`,
 * topmost intersecting heading wins) but rendered as a vertical list
 * with `h3` entries indented under their `h2`, since a legal document
 * has real sub-sections a horizontal tab strip couldn't represent.
 * Hidden below `lg` — `MobileLegalToc` (anchor tabs, mirroring
 * `SectionAnchorTabs`) covers small screens instead.
 */
export function TableOfContents({ entries, label }: { entries: LegalTocEntry[]; label: string }) {
  const [activeId, setActiveId] = useState(entries[0]?.id ?? "");
  const listRef = useRef<HTMLUListElement>(null);

  // Keeps the active entry in view inside the (vertically scrollable,
  // capped-height) list as the reader scrolls the document — same fix as
  // `SectionAnchorTabs`'s mobile strip, so a reader deep in section 20
  // isn't stuck looking at a highlighted "1. Acceptance of Terms" up top.
  // One native `scrollIntoView` call per section change, not per scroll
  // frame — negligible cost.
  useEffect(() => {
    const activeLink = listRef.current?.querySelector<HTMLAnchorElement>(
      `a[href="#${CSS.escape(activeId)}"]`,
    );
    activeLink?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "nearest",
    });
  }, [activeId]);

  useEffect(() => {
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (observedEntries) => {
        for (const entry of observedEntries) {
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
      { rootMargin: "-112px 0px -70% 0px" },
    );
    for (const entry of entries) {
      const element = document.getElementById(entry.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <nav aria-label={label} className="hidden lg:block">
      <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pe-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
        <ul ref={listRef} className="space-y-1 border-s border-border ps-3 text-sm">
          {entries.map((entry) => (
            <li key={entry.id} className={entry.level === 3 ? "ps-3" : undefined}>
              <a
                href={`#${entry.id}`}
                aria-current={activeId === entry.id ? "true" : undefined}
                className={cn(
                  "block py-1 leading-snug transition-colors",
                  activeId === entry.id
                    ? "font-medium text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {entry.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
