"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CompassMark } from "@/components/home/compass-mark";
import { splitWords, TypewriterCursor } from "@/components/home/typewriter";

gsap.registerPlugin(useGSAP);

/** Seconds per revealed word — matches the closing Finale's pace
 *  (0.11s). Word-level (not character-level) so Arabic keeps its
 *  letter shaping — see typewriter.tsx. */
const WORD_STAGGER = 0.11;

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
    <p ref={lineRef} className={`relative ${className}`}>
      <span className="sr-only">{srText}</span>
      <span aria-hidden="true">
        {children}
        <TypewriterCursor cursorRef={cursorRef} />
      </span>
    </p>
  );
}

/** Matches the old `ms-1` (0.25rem) gap the cursor used to carry as its
 *  own margin before this was refactored to transform-based positioning
 *  — without it the cursor lands flush against the word's last letter
 *  (verified: 0px gap), touching it instead of sitting next to it. */
const CURSOR_GAP_PX = 4;

/** Where the cursor should sit relative to a word's own box, expressed
 *  as physical (not logical) pixels — GSAP's `x`/`y` move the cursor by
 *  literal screen pixels regardless of text direction, so direction has
 *  to be resolved explicitly here rather than left to the browser's own
 *  bidi reordering (which is what handled it for free under the old
 *  DOM-insertion approach this replaced). `edge: "start"` is where the
 *  cursor waits before a line's first word has typed; `"end"` is where
 *  it lands after a word completes — in both cases offset a few px
 *  further away from the adjacent word, in reading-forward direction
 *  for "end" and reading-backward for "start". */
function cursorOffsetFor(word: Element, container: Element, edge: "start" | "end") {
  const wordRect = word.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const rtl = getComputedStyle(container).direction === "rtl";
  const atLeftEdge = edge === "start" ? !rtl : rtl;
  const readingForward = rtl ? -1 : 1;
  const outward = edge === "end" ? readingForward : -readingForward;
  return {
    x: (atLeftEdge ? wordRect.left : wordRect.right) - containerRect.left + outward * CURSOR_GAP_PX,
    y: wordRect.top - containerRect.top,
  };
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

        // The cursor tracks the word actually being "typed" instead of
        // sitting parked at the line's final position the whole time
        // (every word's space is already reserved in the DOM from
        // mount, just invisible — so a cursor left at the last word
        // would visually sit way ahead of where typing has gotten to).
        // Pure `x`/`y` transform (see `cursorOffsetFor`) — no DOM
        // mutation, so this never touches layout, and the cursor
        // actually glides between words instead of jump-cutting.
        // `placeCursorAtLineStart` parks it at the line's start the
        // moment that line activates; the stagger's per-word
        // `onComplete` below then glides it forward one word at a time.
        function placeCursorAtLineStart(
          container: HTMLElement | null,
          words: NodeListOf<Element>,
          cursorEl: HTMLSpanElement | null,
        ) {
          if (!cursorEl || !container || !words[0]) return;
          gsap.set(cursorEl, cursorOffsetFor(words[0], container, "start"));
        }
        function glideCursorToWord(container: HTMLElement | null, cursorEl: HTMLSpanElement | null) {
          return function (this: gsap.core.Tween) {
            const word = this.targets()[0] as Element | undefined;
            if (!cursorEl || !container || !word) return;
            gsap.to(cursorEl, { ...cursorOffsetFor(word, container, "end"), duration: 0.15, ease: "power2.out" });
          };
        }

        gsap.set([welcomeWords, line1Words, line2Words], { autoAlpha: 0 });
        gsap.set(compassRef.current, { autoAlpha: 0, y: 16 });
        gsap.set(scrollWrapRef.current, { autoAlpha: 0 });

        const entrance = gsap.timeline({ defaults: { ease: "power2.out" } });
        entrance
          .to(compassRef.current, { autoAlpha: 1, y: 0, duration: 0.6 })
          .call(() => {
            activateCursor(welcomeCursorRef.current);
            placeCursorAtLineStart(welcomeRef.current, welcomeWords, welcomeCursorRef.current);
          })
          .to({}, { duration: 0.3 })
          .to(welcomeWords, {
            autoAlpha: 1,
            duration: 0.06,
            stagger: { each: WORD_STAGGER, onComplete: glideCursorToWord(welcomeRef.current, welcomeCursorRef.current) },
          })
          // "Welcome." gets its own beat before the headline starts —
          // long enough to register as its own line, not just a fast
          // preamble to what follows.
          .to({}, { duration: 1.3 })
          .call(() => {
            activateCursor(line1CursorRef.current);
            placeCursorAtLineStart(line1Ref.current, line1Words, line1CursorRef.current);
          })
          .to(line1Words, {
            autoAlpha: 1,
            duration: 0.06,
            stagger: { each: WORD_STAGGER, onComplete: glideCursorToWord(line1Ref.current, line1CursorRef.current) },
          })
          .to({}, { duration: 0.6 })
          .call(() => {
            activateCursor(line2CursorRef.current);
            placeCursorAtLineStart(line2Ref.current, line2Words, line2CursorRef.current);
          })
          .to(line2Words, {
            autoAlpha: 1,
            duration: 0.06,
            ease: "power3.out",
            stagger: { each: WORD_STAGGER, onComplete: glideCursorToWord(line2Ref.current, line2CursorRef.current) },
          })
          // The cursor is left blinking on the headline on purpose —
          // it never switches off here (unlike between the earlier
          // lines), so it reads as a living detail, not something that
          // vanishes the instant typing finishes.
          .to(scrollWrapRef.current, { autoAlpha: 1, duration: 0.8 }, "+=0.5")
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
      className="dark relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-6 pt-24 pb-32"
    >
      <div aria-hidden="true" className="hero-atmosphere-glow" />
      <div aria-hidden="true" className="night-sky-nebula" />

      {/* The globals.css rule that hides this content pre-JS (to kill the
          flash of finished-then-hidden text) is a plain CSS media query —
          it can't tell JS is missing, only that motion is allowed. Without
          this override, a no-JS visitor with no reduced-motion preference
          would see a permanently empty Hero, since nothing would ever run
          to reveal it. `<noscript>` content only applies with JS off, so
          this restores exactly the visitor this component's SSR is meant
          to serve, without reintroducing the flash for everyone else. */}
      <noscript>
        <style>{`
          .bosla-hero-welcome, .bosla-hero-l1, .bosla-hero-l2,
          .bosla-hero-compass, .bosla-hero-scrollhint {
            opacity: 1 !important;
            visibility: visible !important;
          }
        `}</style>
      </noscript>

      <div ref={compassRef} className="bosla-hero-compass text-primary/80">
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
          className="relative mt-2 text-[clamp(2.25rem,6vw,4.5rem)] leading-[1.08] font-bold tracking-tight text-balance text-foreground"
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
        className="bosla-hero-scrollhint absolute inset-x-0 bottom-10 flex flex-col items-center gap-3 text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase"
      >
        <span>{scrollHint}</span>
        <span className="relative h-8 w-px overflow-hidden bg-border">
          <span ref={scrollDotRef} className="absolute inset-x-0 top-0 h-2 w-px bg-primary" />
        </span>
      </div>
    </section>
  );
}
