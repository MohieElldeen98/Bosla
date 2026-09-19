"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { SectionAnchorTabs } from "@/components/courses/SectionAnchorTabs";
import type { ArticleTocEntry } from "@/blog/utils/article-toc";

export interface ArticleTocLabels {
  /** The rail's heading. */
  title: string;
  /** `aria-label` for the nav landmark — the rail and the mobile strip are
   *  one navigation as far as a screen reader is concerned, so only the
   *  visible one carries it (the other is `hidden`). */
  navLabel: string;
}

/** Top of the scroll-spy band, in px — clears the fixed navbar. The band
 *  ends well above the fold (see `rootMargin`) so the "current" section is
 *  the one being read, not the one whose heading last grazed the top. */
const SPY_BAND_TOP = 112;

/**
 * Scroll-spy over the article's injected heading ids. One shared
 * `IntersectionObserver`, as in `TableOfContents`/`SectionAnchorTabs`:
 * topmost intersecting heading wins, and nothing runs between
 * intersection changes.
 *
 * The fallback branch is the part those two don't have, and it matters on
 * a long article: the band is only ~120px tall, so one fast trackpad
 * flick (or End/Page Down) can carry every heading clean through it
 * without a callback ever landing while one was inside. Intersecting-only
 * logic then leaves the highlight wherever it was — in practice stuck on
 * the first entry, which is exactly when the reader most needs the TOC to
 * tell them where they are. When the band comes up empty we fall back to
 * the last heading above it, which also covers simply standing in the
 * middle of a section longer than the viewport.
 */
function useActiveHeading(entries: ArticleTocEntry[]): string {
  const [activeId, setActiveId] = useState(entries[0]?.id ?? "");

  useEffect(() => {
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (observed) => {
        for (const entry of observed) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.boundingClientRect.top);
          } else {
            visible.delete(entry.target.id);
          }
        }
        if (visible.size > 0) {
          const [topmost] = [...visible.entries()].sort((a, b) => a[1] - b[1]);
          setActiveId(topmost[0]);
          return;
        }
        // `entries` is in document order, so the last one still above the
        // band is the section the reader is inside. Costs one layout read
        // per heading, but only on the callbacks where the cheap branch
        // above found nothing — never on a normal heading-to-heading
        // scroll.
        let current = "";
        for (const entry of entries) {
          const element = document.getElementById(entry.id);
          if (element && element.getBoundingClientRect().top <= SPY_BAND_TOP) current = entry.id;
        }
        // Above the first heading (the article's opening paragraphs) —
        // nothing to correct to, so the initial entry stands.
        if (current) setActiveId(current);
      },
      { rootMargin: `-${SPY_BAND_TOP}px 0px -70% 0px` },
    );
    for (const entry of entries) {
      const element = document.getElementById(entry.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [entries]);

  return activeId;
}

/**
 * The desktop rail — always open, full height, the same shape as the
 * legal pages' `TableOfContents`: the whole list is visible at once and
 * only scrolls internally when it's taller than the viewport, keeping the
 * active row in view as the reader moves through the article.
 */
function TocRail({
  entries,
  title,
  activeId,
}: {
  entries: ArticleTocEntry[];
  title: string;
  activeId: string;
}) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const activeLink = listRef.current?.querySelector<HTMLAnchorElement>(
      `a[href="#${CSS.escape(activeId)}"]`,
    );
    activeLink?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "nearest",
    });
  }, [activeId]);

  return (
    <div className="max-h-[calc(100vh-8rem)] w-52 overflow-y-auto pe-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
      <ul ref={listRef} className="space-y-1 border-s border-border text-sm">
        {entries.map((entry) => (
          <li key={entry.id} style={{ paddingInlineStart: `${entry.depth * 0.7}rem` }}>
            <a
              href={`#${entry.id}`}
              // Plain anchor on purpose: smooth scrolling is the global
              // `scroll-behavior`, and the hash stays shareable.
              aria-current={activeId === entry.id ? "true" : undefined}
              className={cn(
                "block border-s-2 py-1.5 pe-1 ps-3 leading-snug transition-colors -ms-px",
                activeId === entry.id
                  ? "border-primary font-medium text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The public article page's Table of Contents, in the same two forms as
 * the legal pages: a full-height sticky list in the start gutter on wide
 * screens, and a horizontally scrolling anchor strip pinned under the
 * navbar everywhere else (`SectionAnchorTabs`, shared with `/privacy`).
 *
 * The rail appears at `xl`, not `lg`: below 1280px the gutter beside the
 * `max-w-3xl` column is too narrow for a readable list of headings, so
 * `lg` keeps the strip.
 *
 * `entries` must come from `buildArticleToc`, which is also what injects
 * the matching `id`s into the rendered body.
 */
export function ArticleToc({
  entries,
  labels,
  dir,
}: {
  entries: ArticleTocEntry[];
  labels: ArticleTocLabels;
  /** The article's own writing direction — the headings are its text, so
   *  the list reads in the article's direction, not the UI locale's. */
  dir: "ltr" | "rtl";
}) {
  const activeId = useActiveHeading(entries);

  if (entries.length === 0) return null;

  const stripSections = entries
    .filter((entry) => entry.depth === 0)
    .map((entry) => ({ id: entry.id, label: entry.text }));

  return (
    <>
      {/* Full-bleed strip: it sits inside the page's padded container, so
          the negative margins hand it the padding back. It must be a
          direct child of that container (no wrapper box), or `sticky`
          would only hold within the wrapper's own height. */}
      <SectionAnchorTabs
        sections={stripSections}
        navLabel={labels.navLabel}
        breakpoint="xl"
        className="-mx-6 lg:-mx-8"
      />

      {/* `dir` deliberately sits on the inner nav, not the <aside>:
          `start-0` is `inset-inline-start`, so the article's own direction
          on the positioned element would decide which gutter the rail
          lands in. The rail belongs in the *page's* start gutter (the
          share rail owns the other one) whatever language the article is
          written in; only its text runs the article's way. */}
      <aside className="absolute top-12 bottom-0 start-0 hidden xl:block">
        <nav aria-label={labels.navLabel} dir={dir} className="sticky top-28">
          <TocRail entries={entries} title={labels.title} activeId={activeId} />
        </nav>
      </aside>
    </>
  );
}
