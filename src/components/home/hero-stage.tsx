"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CompassMark } from "@/components/home/compass-mark";
import { splitWords, TypewriterCursor } from "@/components/home/typewriter";

gsap.registerPlugin(useGSAP);

/** Seconds per revealed word — a touch snappier than the closing
 *  Finale's pace (0.11s): this is the very first thing a visitor
 *  sees, so it should feel alive quickly, not like a wait. Word-level
 *  (not character-level) so Arabic keeps its letter shaping — see
 *  typewriter.tsx. */
const WORD_STAGGER = 0.09;

function TypedLine({
  lineRef,
  cursorRef,
  srText,
  className,
  children,
}: {
  lineRef: React.Ref<HTMLParagraphElement>;
  cursorRef: React.Ref<HTMLSpanElement>;
  srText: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <p ref={lineRef} className={className}>
      <span className="sr-only">{srText}</span>
      <span aria-hidden="true">
        {children}
        <TypewriterCursor cursorRef={cursorRef} />
      </span>
    </p>
  );
}

/**
 * The Hero's motion — isolated in its own Client Component so
 * `HeroSection` (Server) never ships GSAP's translation-fetch dependency
 * chain to the browser, just these five already-resolved strings.
 *
 * Nothing here is hidden by default: every character renders as real,
 * visible text in the server-rendered HTML — the typewriter effect is
 * pure GSAP staggered opacity on top of that, applied only once mounted
 * on the client, only when motion is allowed. A visitor with JS
 * disabled, or whose bundle is slow to hydrate, sees the finished Hero
 * immediately — never a blank one. That was a real bug the previous
 * Hero hit with Framer Motion (baking `opacity: 0` into the SSR HTML
 * itself); this structure can't repeat it.
 *
 * No CTA here on purpose — the Hero's only job is the emotional line.
 * The scroll cue below is the only call to action: keep going.
 */
export function HeroStage({
  welcome,
  headlineLine1,
  headlineLine2Prefix,
  headlineLine2Highlight,
  headlineLine2Suffix,
  scrollHint,
}: {
  welcome: string;
  headlineLine1: string;
  headlineLine2Prefix: string;
  headlineLine2Highlight: string;
  headlineLine2Suffix: string;
  scrollHint: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const compassRef = useRef<HTMLDivElement>(null);
  const welcomeRef = useRef<HTMLParagraphElement>(null);
  const line1Ref = useRef<HTMLParagraphElement>(null);
  const line2Ref = useRef<HTMLHeadingElement>(null);
  const welcomeCursorRef = useRef<HTMLSpanElement>(null);
  const line1CursorRef = useRef<HTMLSpanElement>(null);
  const line2CursorRef = useRef<HTMLSpanElement>(null);
  const scrollWrapRef = useRef<HTMLDivElement>(null);
  const scrollDotRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (!containerRef.current) return () => {};

        const welcomeWords = containerRef.current.querySelectorAll(".bosla-hero-welcome");
        const line1Words = containerRef.current.querySelectorAll(".bosla-hero-l1");
        const line2Words = containerRef.current.querySelectorAll(".bosla-hero-l2");
        const cursorEls = [welcomeCursorRef.current, line1CursorRef.current, line2CursorRef.current];

        function activateCursor(el: HTMLSpanElement | null) {
          cursorEls.forEach((c) => c?.classList.remove("is-active"));
          el?.classList.add("is-active");
        }

        gsap.set([welcomeWords, line1Words, line2Words], { autoAlpha: 0 });
        gsap.set(compassRef.current, { autoAlpha: 0, y: 16 });
        gsap.set(scrollWrapRef.current, { autoAlpha: 0 });

        const entrance = gsap.timeline({ defaults: { ease: "power2.out" } });
        entrance
          .to(compassRef.current, { autoAlpha: 1, y: 0, duration: 0.6 })
          .call(() => activateCursor(welcomeCursorRef.current))
          .to({}, { duration: 0.3 })
          .to(welcomeWords, { autoAlpha: 1, duration: 0.06, stagger: WORD_STAGGER })
          .to({}, { duration: 0.5 })
          .call(() => activateCursor(line1CursorRef.current))
          .to(line1Words, { autoAlpha: 1, duration: 0.06, stagger: WORD_STAGGER })
          .to({}, { duration: 0.5 })
          .call(() => activateCursor(line2CursorRef.current))
          .to(line2Words, { autoAlpha: 1, duration: 0.06, stagger: WORD_STAGGER, ease: "power3.out" })
          .to({}, { duration: 0.5 })
          .call(() => cursorEls.forEach((c) => c?.classList.remove("is-active")))
          .to(scrollWrapRef.current, { autoAlpha: 1, duration: 0.8 }, "-=0.2")
          // The scroll cue is the one motion that keeps going — a quiet,
          // continuous hint that this page is a journey, not a poster.
          .to(scrollDotRef.current, {
            y: 20,
            repeat: -1,
            yoyo: true,
            duration: 1.3,
            ease: "sine.inOut",
          });

        return () => entrance.kill();
      });

      return () => mm.revert();
    },
    { scope: containerRef },
  );

  return (
    <section
      ref={containerRef}
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 pt-24 pb-32"
    >
      <div ref={compassRef} className="text-primary/80">
        <CompassMark className="size-10" />
      </div>

      <div className="relative mx-auto mt-8 flex max-w-3xl flex-col items-center gap-3 text-center">
        <TypedLine
          lineRef={welcomeRef}
          cursorRef={welcomeCursorRef}
          srText={welcome}
          className="text-base font-medium text-muted-foreground sm:text-lg"
        >
          {splitWords(welcome, "w", "bosla-hero-welcome")}
        </TypedLine>
        <TypedLine
          lineRef={line1Ref}
          cursorRef={line1CursorRef}
          srText={headlineLine1}
          className="text-lg font-medium text-muted-foreground sm:text-xl"
        >
          {splitWords(headlineLine1, "l1", "bosla-hero-l1")}
        </TypedLine>
        <h1
          ref={line2Ref}
          className="mt-2 text-[clamp(2.25rem,6vw,4.5rem)] leading-[1.08] font-bold tracking-tight text-balance text-foreground"
        >
          <span className="sr-only">
            {headlineLine2Prefix}
            {headlineLine2Highlight}
            {headlineLine2Suffix}
          </span>
          <span aria-hidden="true">
            {splitWords(headlineLine2Prefix, "l2p", "bosla-hero-l2")}
            {splitWords(headlineLine2Highlight, "l2h", "bosla-hero-l2", true, true)}
            {splitWords(headlineLine2Suffix, "l2s", "bosla-hero-l2")}
            <TypewriterCursor cursorRef={line2CursorRef} />
          </span>
        </h1>
      </div>

      <div
        ref={scrollWrapRef}
        className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-3 text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase"
      >
        <span>{scrollHint}</span>
        <span className="relative h-8 w-px overflow-hidden bg-border">
          <span ref={scrollDotRef} className="absolute inset-x-0 top-0 h-2 w-px bg-primary" />
        </span>
      </div>
    </section>
  );
}
