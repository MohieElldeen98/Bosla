"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CompassMark } from "@/components/home/compass-mark";
import { TypewriterLine } from "@/components/home/typewriter";

gsap.registerPlugin(useGSAP);

const LINE_WELCOME = 0;
const LINE_1 = 1;
const LINE_2 = 2;

/** Pause after a line finishes typing before the next one begins —
 *  "Welcome." gets the longest beat, long enough to register as its own
 *  line, not just a fast preamble to what follows. */
const PAUSE_AFTER_WELCOME_MS = 1300;
const PAUSE_AFTER_LINE1_MS = 600;

/**
 * The Hero's motion — isolated in its own Client Component so
 * `HeroSection` (Server) never ships GSAP's translation-fetch dependency
 * chain to the browser, just these five already-resolved strings.
 *
 * Nothing here is hidden by default: every character renders as real,
 * visible text in the server-rendered HTML — the typewriter effect is a
 * pure CSS `width`/`steps()` reveal per line (see typewriter.tsx),
 * sequenced by a small bit of React state, applied only once mounted on
 * the client and only when motion is allowed. A visitor with JS
 * disabled, or whose bundle is slow to hydrate, sees the finished Hero
 * immediately — never a blank one (see the `<noscript>` override below).
 *
 * The compass mark and the scroll cue below are the two things still on
 * a GSAP tween — unrelated to the typed text, so they keep the tool
 * that already fits them.
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
  const scrollWrapRef = useRef<HTMLDivElement>(null);
  const scrollDotRef = useRef<HTMLSpanElement>(null);

  const [started, setStarted] = useState(false);
  const [activeLine, setActiveLine] = useState(LINE_WELCOME);

  function revealScrollHint() {
    if (!scrollWrapRef.current) return;
    gsap.to(scrollWrapRef.current, { autoAlpha: 1, duration: 0.8, ease: "power2.out" });
    // The scroll cue is the one motion that keeps going — a quiet,
    // continuous hint that this page is a journey, not a poster.
    gsap.to(scrollDotRef.current, { y: 20, repeat: -1, yoyo: true, duration: 1.3, ease: "sine.inOut" });
  }

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (!compassRef.current) return () => {};

        gsap.set(compassRef.current, { autoAlpha: 0, y: 16 });
        gsap.set(scrollWrapRef.current, { autoAlpha: 0 });

        const entrance = gsap.timeline({ defaults: { ease: "power2.out" } });
        entrance.to(compassRef.current, { autoAlpha: 1, y: 0, duration: 0.6 }).call(
          () => setStarted(true),
          [],
          "+=0.3",
        );

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

      {/* Without JS, `started` never flips true and no word ever gets its
          `.is-revealed` class — and globals.css's `:not(.is-revealed) {
          display: none }` rule is a plain CSS media query, evaluated
          regardless of JS, so it would hide every word forever for a
          no-JS visitor whose system allows motion. This restores full
          text for exactly that visitor, without reintroducing a flash
          for everyone else (the compass/scroll-hint use their own class
          + media query for the same reason). */}
      <noscript>
        <style>{`
          .bosla-typed-word, .bosla-hero-compass, .bosla-hero-scrollhint {
            display: inline-block !important;
            opacity: 1 !important;
            visibility: visible !important;
          }
        `}</style>
      </noscript>

      <div ref={compassRef} className="bosla-hero-compass text-primary/80">
        <CompassMark className="size-10" />
      </div>

      <div className="relative mx-auto mt-8 flex max-w-3xl flex-col items-center gap-3 text-center">
        <TypewriterLine
          className="text-base font-medium text-muted-foreground sm:text-lg"
          segments={[{ text: welcome }]}
          active={started && activeLine === LINE_WELCOME}
          showCursor={started && activeLine === LINE_WELCOME}
          onDone={() => {
            setTimeout(() => setActiveLine(LINE_1), PAUSE_AFTER_WELCOME_MS);
          }}
          srText={welcome}
        />
        <TypewriterLine
          className="text-lg font-medium text-muted-foreground sm:text-xl"
          segments={[{ text: headlineLine1 }]}
          active={started && activeLine === LINE_1}
          showCursor={started && activeLine === LINE_1}
          onDone={() => {
            setTimeout(() => setActiveLine(LINE_2), PAUSE_AFTER_LINE1_MS);
          }}
          srText={headlineLine1}
        />
        <TypewriterLine
          as="h1"
          className="mt-2 text-[clamp(2.25rem,6vw,4.5rem)] leading-[1.08] font-bold tracking-tight text-balance text-foreground"
          segments={[
            { text: headlineLine2Prefix },
            { text: headlineLine2Highlight, highlighted: true },
            { text: headlineLine2Suffix },
          ]}
          active={started && activeLine === LINE_2}
          // Left blinking on the headline on purpose — it never switches
          // off here (unlike between the earlier lines), so it reads as
          // a living detail, not something that vanishes the instant
          // typing finishes.
          showCursor={started && activeLine === LINE_2}
          onDone={revealScrollHint}
          srText={`${headlineLine2Prefix}${headlineLine2Highlight}${headlineLine2Suffix}`}
        />
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
