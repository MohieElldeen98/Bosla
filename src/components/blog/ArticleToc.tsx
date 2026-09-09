"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, List } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ArticleTocEntry } from "@/blog/utils/article-toc";

export interface ArticleTocLabels {
  /** The panel's own label, shown next to the icon in both states. */
  title: string;
  /** `aria-label` for the nav landmark — the two panels below are one
   *  navigation as far as a screen reader is concerned, so only the
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
 * One collapsible TOC panel. Rendered twice by `ArticleToc` — once as the
 * sticky desktop rail, once as the in-flow accordion small screens get
 * instead — with independent open state each, since only one of the two
 * is ever visible.
 *
 * The expand is a `grid-template-rows: 0fr → 1fr` transition rather than
 * a max-height guess: the list animates to its *real* height, so a
 * 4-heading article and a 20-heading one both open at the same speed
 * without the dead time a too-generous max-height leaves behind.
 */
function TocPanel({
  entries,
  labels,
  activeId,
  variant,
}: {
  entries: ArticleTocEntry[];
  labels: ArticleTocLabels;
  activeId: string;
  variant: "rail" | "inline";
}) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);

  // Keeps the active row in view inside the (capped-height, scrollable)
  // list, so a reader deep in section 14 isn't looking at a highlight
  // stuck off-screen. Rail only, and only while open: `scrollIntoView`
  // scrolls every scrollable ancestor including the document, which is
  // harmless for a `sticky` panel that's always on screen but would yank
  // the page back up to the inline accordion the reader scrolled past.
  useEffect(() => {
    if (variant !== "rail" || !open) return;
    const activeLink = listRef.current?.querySelector<HTMLAnchorElement>(
      `a[href="#${CSS.escape(activeId)}"]`,
    );
    activeLink?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "nearest",
    });
  }, [activeId, open, variant]);

  return (
    <div
      className={cn(
        // Collapsed the rail is a pill; expanded it resolves into a card.
        // Both shapes are the same element, so opening reads as one
        // object unfolding rather than a menu appearing over the page.
        // Opaque, not a translucent/blurred surface: Tailwind v4
        // compiles `bg-card/85` to `color-mix()`, which Safari 15 drops
        // outright (CLAUDE.md) — and the panel has nothing behind it
        // worth showing through anyway, in the gutter or in flow.
        "overflow-hidden border border-border bg-card",
        "transition-[width,border-radius,box-shadow] duration-300 ease-out motion-reduce:transition-none",
        open && "shadow-card",
        variant === "rail"
          ? open
            ? "w-52 rounded-2xl"
            : "w-[10.5rem] rounded-full"
          : "w-full rounded-2xl",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-expanded={open}
        aria-controls={listId}
        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-start text-sm font-medium text-foreground transition-colors hover:text-primary"
      >
        <List aria-hidden="true" className="size-4 shrink-0 text-primary" />
        <span className="flex-1 truncate">{labels.title}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-out motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </button>

      <div
        id={listId}
        // Clipped-but-present content stays tabbable without this — a
        // keyboard reader would fall into an invisible list of links.
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <ul
            ref={listRef}
            className="max-h-[min(60vh,24rem)] overflow-y-auto border-t border-border p-2 text-sm [scrollbar-width:thin]"
          >
            {entries.map((entry) => (
              <li key={entry.id} style={{ paddingInlineStart: `${entry.depth * 0.7}rem` }}>
                <a
                  href={`#${entry.id}`}
                  // No click handler on purpose. Smooth scrolling is the
                  // global `scroll-behavior` (globals.css, reduced-motion
                  // aware) acting on a plain anchor, so a jump still lands
                  // on the right section with JS disabled and the hash
                  // stays shareable.
                  //
                  // Collapsing the inline accordion here — the obvious
                  // nicety — is what must NOT happen: it removes its own
                  // height from the page *above* the target while the
                  // smooth scroll is already animating toward the old
                  // offset, so the reader overshoots the heading by
                  // roughly the height of the open list. Left open, it
                  // simply scrolls out of view behind them.
                  aria-current={activeId === entry.id ? "true" : undefined}
                  className={cn(
                    "block rounded-e-md border-s-2 py-1.5 pe-1 ps-2.5 leading-snug transition-colors",
                    activeId === entry.id
                      ? "border-primary font-medium text-primary"
                      : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  <span className="line-clamp-2">{entry.text}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * The public article page's Table of Contents — a collapsible, sticky
 * sidebar in the body's start-side gutter, collapsed to a compact
 * "Contents" pill until the reader opens it, with the section they're
 * currently reading highlighted as they scroll.
 *
 * Renders both presentations and lets CSS pick one, because they live in
 * different places in the page: the rail is absolutely positioned against
 * the article's `max-w-7xl` container (it can't be in the reading column
 * or it would push the text off-centre), while small screens get an
 * in-flow accordion directly above the body. One observer feeds both.
 *
 * The rail appears at `xl`, not `lg`: below 1280px the gutter beside the
 * `max-w-3xl` column is only ~96px, which fits the narrow share rail but
 * not a readable list of headings — so `lg` keeps the accordion.
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

  return (
    <>
      <nav aria-label={labels.navLabel} dir={dir} className="mx-auto mt-10 max-w-3xl xl:hidden">
        <TocPanel entries={entries} labels={labels} activeId={activeId} variant="inline" />
      </nav>

      {/* `dir` deliberately sits on the inner nav, not the <aside>:
          `start-0` is `inset-inline-start`, so putting the article's own
          direction on the positioned element itself would decide which
          gutter the rail lands in. The rail belongs in the *page's* start
          gutter (the share rail owns the other one) whatever language the
          article is written in; only its text runs the article's way. */}
      <aside className="absolute top-12 bottom-0 start-0 hidden xl:block">
        <nav aria-label={labels.navLabel} dir={dir} className="sticky top-28">
          <TocPanel entries={entries} labels={labels} activeId={activeId} variant="rail" />
        </nav>
      </aside>
    </>
  );
}
