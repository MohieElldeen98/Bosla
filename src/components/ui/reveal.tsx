"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * SCOPE — read before reaching for this in a new spot:
 *
 * `Reveal` is a narrow, deliberate substitute for Framer Motion's
 * `whileInView` in exactly one situation: a purely decorative, one-time
 * fade/translate-up on a section that has no other reason to be a Client
 * Component (Performance Sprint 2, `WhyKnowledgeOs`/`LearningExperience`/
 * `Testimonials`/`FaqSection`/`CtaSection`). It is NOT a general animation
 * utility and NOT a Framer Motion replacement project-wide — `Hero`'s
 * autoplay carousel, `FeaturedCourses`' filter/`AnimatePresence`/`layout`
 * transitions, and anything else with real interactive or multi-state
 * animation should keep using Framer Motion as before. If you need
 * anything beyond "reveal this element once when it scrolls into view" —
 * hover/drag/gesture animations, state-driven transitions, exit
 * animations, spring physics — that's Framer Motion's job, not this
 * component's. Don't extend this file to cover those; add Framer Motion
 * to that component directly instead.
 *
 * Implementation: one shared IntersectionObserver for every `<Reveal>` on
 * the page — not one per instance. Adds `.is-revealed` on first
 * intersection, then unobserves immediately: a true one-time reveal.
 * Framer Motion's own `viewport={{ once: true }}` keeps its observer
 * attached for the component's whole lifetime instead of disconnecting
 * after the first reveal (verified directly in framer-motion's source
 * during Sprint 2's investigation) — this is intentionally more
 * aggressive since a one-shot reveal never needs to re-observe.
 *
 * The transition itself is plain CSS (`.reveal` / `.is-revealed` in
 * globals.css, gated behind `prefers-reduced-motion: no-preference`) —
 * this component's only job is toggling one class, once. Replaces an
 * earlier CSS `animation-timeline: view()` experiment, which measured
 * *worse* than Framer Motion's own `whileInView` (continuous
 * scroll-timeline evaluation vs. a native, mostly-idle
 * IntersectionObserver) — this custom observer measured back at parity
 * with Framer Motion's own cost while keeping the bundle-size win.
 */
let sharedObserver: IntersectionObserver | null = null;

function getSharedObserver(): IntersectionObserver {
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-revealed");
          sharedObserver!.unobserve(entry.target);
        }
      },
      { rootMargin: "-80px" },
    );
  }
  return sharedObserver;
}

export function Reveal({
  children,
  className,
  style,
  "aria-hidden": ariaHidden,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = getSharedObserver();
    observer.observe(el);
    return () => observer.unobserve(el);
  }, []);

  return (
    <div
      ref={ref}
      className={className ? `reveal ${className}` : "reveal"}
      style={style}
      aria-hidden={ariaHidden}
    >
      {children}
    </div>
  );
}
