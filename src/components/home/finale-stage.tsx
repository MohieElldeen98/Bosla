"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { splitWords, TypewriterCursor } from "@/components/home/typewriter";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Extra pinned scroll distance reserved for the sequence to play out
 *  on. It isn't scrubbed — the timeline plays on a real clock once
 *  triggered — this just needs to be generous enough that a normally-
 *  paced scroller doesn't outrun roughly an 11s sequence. Scrolling
 *  straight through faster than that is exactly the "scrolled away"
 *  case this is built to stop cleanly for, not a bug. (Was 5200 —
 *  ~5.7 viewport heights of pinned scroll. At a normal scroll pace
 *  that's far more dead space *after* the sequence finishes than
 *  before it, since the timeline runs on its own clock regardless of
 *  how fast someone scrolls through the pin. Cut roughly in half.) */
const FINALE_BUFFER_PX = 2600;

/** Seconds per revealed word — tuned for a natural, unhurried reading
 *  pace. The brief is explicit: do not rush this. Word-level (not
 *  character-level) so Arabic keeps its letter shaping — see
 *  typewriter.tsx. */
const WORD_STAGGER = 0.11;

function FinaleLine({
  as = "p",
  lineRef,
  cursorRef,
  srText,
  children,
}: {
  /** `h2` for line1 only — gives this closing scene a heading-navigation
   *  landmark (it had none) without turning all three lines into
   *  headings; they read as one continuous thought, not a heading
   *  followed by body copy. */
  as?: "p" | "h2";
  lineRef: React.Ref<HTMLElement>;
  cursorRef: React.Ref<HTMLSpanElement>;
  srText: string;
  children: React.ReactNode;
}) {
  // Widened to `ElementType` on purpose: TS infers a ref type from the
  // *union* of every tag's own JSX.IntrinsicElements entry when `Tag`
  // stays narrowed to `"p" | "h2"`, which demands both tags' element
  // interfaces at once (down to deprecated attrs like `<p>`'s `align`)
  // instead of the `HTMLElement` supertype `lineRef` actually declares.
  const Tag = as as React.ElementType;
  return (
    <Tag
      ref={lineRef}
      className="relative text-[clamp(1.5rem,4vw,2.5rem)] leading-[1.3] font-medium text-balance text-foreground"
    >
      <span className="sr-only">{srText}</span>
      <span aria-hidden="true">
        {children}
        <TypewriterCursor cursorRef={cursorRef} />
      </span>
    </Tag>
  );
}

/** Matches the old `ms-1` (0.25rem) gap the cursor used to carry as its
 *  own margin before this was refactored to transform-based positioning
 *  — without it the cursor lands flush against the word's last letter
 *  instead of sitting next to it. */
const CURSOR_GAP_PX = 4;

/** Where the cursor should sit relative to a word's own box, in
 *  physical (not logical) pixels — GSAP's `x`/`y` move it by literal
 *  screen pixels regardless of text direction, so direction has to be
 *  resolved explicitly rather than left to the browser's own bidi
 *  reordering. Matches the identical helper in hero-stage.tsx. */
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
 * The actual last scene of the story — not "another section." A
 * pinned, real-time GSAP timeline (never scroll-scrubbed, because a
 * typewriter tied to scrub would type backwards the instant someone
 * scrolls up half a pixel): silence, a cursor, three typed lines, a
 * fade, then the brand settling into place. ScrollTrigger only starts
 * it once and stops it if the visitor scrolls away before it
 * finishes — it never drives it frame by frame.
 *
 * Own background + a z-index above the (z-40) global navbar — while
 * this section is on screen, it's meant to be the *only* thing on
 * screen, per the brief: no navbar, no logo, no decoration. Under
 * `prefers-reduced-motion` (or no JS), none of the pin/typewriter
 * machinery ever engages — this renders as a plain static passage in
 * normal document flow instead, the same fallback convention as every
 * other section on this page.
 */
export function FinaleStage({
  line1,
  line2Prefix,
  line2Highlight,
  line2Suffix,
  line3,
  brand,
}: {
  line1: string;
  line2Prefix: string;
  line2Highlight: string;
  line2Suffix: string;
  line3: string;
  brand: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const textPhaseRef = useRef<HTMLDivElement>(null);
  const boslaPhaseRef = useRef<HTMLDivElement>(null);
  const boslaTextRef = useRef<HTMLSpanElement>(null);
  const line1Ref = useRef<HTMLElement>(null);
  const line2Ref = useRef<HTMLElement>(null);
  const line3Ref = useRef<HTMLElement>(null);
  const cursor1Ref = useRef<HTMLSpanElement>(null);
  const cursor2Ref = useRef<HTMLSpanElement>(null);
  const cursor3Ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (!sectionRef.current) return () => {};

        gsap.set(sectionRef.current, { height: "100dvh", overflow: "hidden" });
        gsap.set([textPhaseRef.current, boslaPhaseRef.current], { position: "absolute", inset: 0 });

        const wordEls = {
          l1: sectionRef.current.querySelectorAll(".bosla-finale-l1"),
          l2: sectionRef.current.querySelectorAll(".bosla-finale-l2"),
          l3: sectionRef.current.querySelectorAll(".bosla-finale-l3"),
        };
        const cursorEls = [cursor1Ref.current, cursor2Ref.current, cursor3Ref.current];

        function activateCursor(el: HTMLSpanElement | null) {
          cursorEls.forEach((c) => c?.classList.remove("is-active"));
          el?.classList.add("is-active");
        }
        // Glides the cursor along with the word actually being "typed"
        // instead of leaving it parked at the line's final position —
        // every word's space is already reserved in the DOM from mount
        // (just invisible), so a cursor left at the last word would sit
        // way ahead of where typing has visually gotten to. Pure
        // `x`/`y` transform, no DOM mutation. See the matching comment
        // in hero-stage.tsx.
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
        function resetFinale() {
          cursorEls.forEach((c) => c?.classList.remove("is-active"));
          gsap.set([wordEls.l1, wordEls.l2, wordEls.l3], { autoAlpha: 0 });
          gsap.set([line1Ref.current, line2Ref.current, line3Ref.current], { autoAlpha: 1 });
          gsap.set(boslaTextRef.current, { autoAlpha: 0, y: 16 });
        }
        resetFinale();

        const finaleTl = gsap.timeline({ paused: true });
        finaleTl
          .call(resetFinale)
          .to({}, { duration: 1 }) // the silence — nothing happens on purpose
          .call(() => {
            activateCursor(cursor1Ref.current);
            placeCursorAtLineStart(line1Ref.current, wordEls.l1, cursor1Ref.current);
          })
          .to({}, { duration: 0.5 }) // the cursor sits alone before anything types
          .to(wordEls.l1, {
            autoAlpha: 1,
            duration: 0.07,
            stagger: { each: WORD_STAGGER, onComplete: glideCursorToWord(line1Ref.current, cursor1Ref.current) },
          })
          .to({}, { duration: 1.1 })
          .call(() => {
            activateCursor(cursor2Ref.current);
            placeCursorAtLineStart(line2Ref.current, wordEls.l2, cursor2Ref.current);
          })
          .to(wordEls.l2, {
            autoAlpha: 1,
            duration: 0.07,
            stagger: { each: WORD_STAGGER, onComplete: glideCursorToWord(line2Ref.current, cursor2Ref.current) },
          })
          .to({}, { duration: 1.1 })
          .call(() => {
            activateCursor(cursor3Ref.current);
            placeCursorAtLineStart(line3Ref.current, wordEls.l3, cursor3Ref.current);
          })
          .to(wordEls.l3, {
            autoAlpha: 1,
            duration: 0.07,
            stagger: { each: WORD_STAGGER, onComplete: glideCursorToWord(line3Ref.current, cursor3Ref.current) },
          })
          .to({}, { duration: 0.9 }) // the question lingers, cursor still blinking
          .call(() => cursorEls.forEach((c) => c?.classList.remove("is-active")))
          .to([line1Ref.current, line2Ref.current, line3Ref.current], { autoAlpha: 0, duration: 0.6 })
          .to({}, { duration: 0.6 }) // empty again, briefly
          .to(boslaTextRef.current, { autoAlpha: 1, y: 0, duration: 1, ease: "power2.out" });

        const st = ScrollTrigger.create({
          trigger: sectionRef.current,
          start: "top top",
          end: `+=${FINALE_BUFFER_PX}`,
          pin: true,
          onEnter: () => finaleTl.restart(),
          onEnterBack: () => finaleTl.restart(),
          onLeave: () => finaleTl.pause(),
          onLeaveBack: () => {
            finaleTl.pause(0);
            resetFinale();
          },
        });

        return () => {
          finaleTl.kill();
          st.kill();
        };
      });

      return () => mm.revert();
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="relative z-50 bg-background">
      <div ref={textPhaseRef} className="flex flex-col items-center justify-center gap-5 px-6 py-32 text-center">
        <FinaleLine as="h2" lineRef={line1Ref} cursorRef={cursor1Ref} srText={line1}>
          {splitWords(line1, "l1", "bosla-finale-l1")}
        </FinaleLine>
        <FinaleLine
          lineRef={line2Ref}
          cursorRef={cursor2Ref}
          srText={`${line2Prefix}${line2Highlight}${line2Suffix}`}
        >
          {splitWords(line2Prefix, "l2p", "bosla-finale-l2")}
          {splitWords(line2Highlight, "l2h", "bosla-finale-l2", true, true)}
          {splitWords(line2Suffix, "l2s", "bosla-finale-l2")}
        </FinaleLine>
        <FinaleLine lineRef={line3Ref} cursorRef={cursor3Ref} srText={line3}>
          {splitWords(line3, "l3", "bosla-finale-l3")}
        </FinaleLine>
      </div>
      <div ref={boslaPhaseRef} className="flex items-center justify-center px-6 py-32 text-center">
        <span ref={boslaTextRef} className="text-[clamp(3rem,9vw,6rem)] font-bold tracking-tight text-foreground">
          {brand}
        </span>
      </div>
    </section>
  );
}
