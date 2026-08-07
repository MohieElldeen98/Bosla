"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TypewriterLine } from "@/components/home/typewriter";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Extra pinned scroll distance reserved for the sequence to play out
 *  on. It isn't scrubbed — the timeline plays on a real clock once
 *  triggered — this just needs to be generous enough that a normally-
 *  paced scroller doesn't outrun roughly an 11s sequence. Scrolling
 *  straight through faster than that is exactly the "scrolled away"
 *  case this is built to stop cleanly for, not a bug. */
const FINALE_BUFFER_PX = 2600;

const LINE1 = 0;
const LINE2 = 1;
const LINE3 = 2;
const NONE = -1;

/** Beats of the sequence, in milliseconds — tuned for a natural,
 *  unhurried reading pace. The brief is explicit: do not rush this. */
const SILENCE_MS = 1000; // nothing happens on purpose, before line1
const BETWEEN_LINES_MS = 1100;
const LINGER_MS = 900; // the question lingers, cursor still blinking
const FADE_OUT_MS = 600;
const EMPTY_PAUSE_MS = 600; // empty again, briefly

function FinaleLine({
  as = "p",
  className,
  text,
  active,
  showCursor,
  onDone,
  resetKey,
}: {
  as?: "p" | "h2";
  className: string;
  text: string;
  active: boolean;
  showCursor: boolean;
  onDone: () => void;
  resetKey: number;
}) {
  return (
    <TypewriterLine
      as={as}
      className={className}
      segments={[{ text }]}
      active={active}
      showCursor={showCursor}
      onDone={onDone}
      srText={text}
      resetKey={resetKey}
    />
  );
}

/**
 * The actual last scene of the story — not "another section." A
 * pinned, real-time sequence (never scroll-scrubbed, because a
 * typewriter tied to scrub would type backwards the instant someone
 * scrolls up half a pixel): silence, a cursor, three typed lines, a
 * fade, then the brand settling into place. ScrollTrigger starts the
 * sequence on every entry (forward or backward) and stops it cleanly if
 * the visitor scrolls away before it finishes.
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

  const [activeLine, setActiveLine] = useState(NONE);
  const [runId, setRunId] = useState(0);
  const pendingRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearPending() {
    pendingRef.current.forEach(clearTimeout);
    pendingRef.current = [];
  }
  function after(ms: number, fn: () => void) {
    pendingRef.current.push(setTimeout(fn, ms));
  }

  function resetVisual() {
    gsap.set([textPhaseRef.current, boslaPhaseRef.current], { autoAlpha: 1 });
    gsap.set(boslaTextRef.current, { autoAlpha: 0, y: 16 });
  }

  /** Bumping `runId` is what actually clears each TypewriterLine's own
   *  `revealedCount` (see its `resetKey` prop) — without it, scrolling
   *  away mid-sequence (or past the end) leaves already-typed words
   *  showing forever, since nothing else tells them to forget. */
  function resetToHidden() {
    clearPending();
    setRunId((id) => id + 1);
    setActiveLine(NONE);
    resetVisual();
  }

  function restartSequence() {
    resetToHidden();
    after(SILENCE_MS, () => setActiveLine(LINE1));
  }

  function finishSequence() {
    after(LINGER_MS, () => {
      setActiveLine(NONE); // cursor stops
      gsap.to(textPhaseRef.current, { autoAlpha: 0, duration: FADE_OUT_MS / 1000 });
      after(FADE_OUT_MS + EMPTY_PAUSE_MS, () => {
        gsap.to(boslaTextRef.current, { autoAlpha: 1, y: 0, duration: 1, ease: "power2.out" });
      });
    });
  }

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (!sectionRef.current) return () => {};

        gsap.set(sectionRef.current, { height: "100dvh", overflow: "hidden" });
        gsap.set([textPhaseRef.current, boslaPhaseRef.current], { position: "absolute", inset: 0 });
        resetVisual();

        const st = ScrollTrigger.create({
          trigger: sectionRef.current,
          start: "top top",
          end: `+=${FINALE_BUFFER_PX}`,
          pin: true,
          onEnter: restartSequence,
          onEnterBack: restartSequence,
          onLeave: clearPending,
          onLeaveBack: resetToHidden,
        });

        return () => {
          clearPending();
          st.kill();
        };
      });

      return () => mm.revert();
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="relative z-50 bg-background">
      {/* Finale never had a static pre-hide rule before — its lines only
          ever went invisible via JS (ScrollTrigger + this sequence). Now
          that hiding is a plain CSS media query (`.bosla-typed-word
          :not(.is-revealed) { display: none }` under motion-allowed —
          see globals.css), evaluated regardless of JS, a no-JS visitor
          whose system allows motion would otherwise see a permanently
          empty scene, since nothing would ever run to type it. This
          restores full text for exactly that visitor. */}
      <noscript>
        <style>{`.bosla-typed-word { display: inline-block !important; }`}</style>
      </noscript>
      <div ref={textPhaseRef} className="flex flex-col items-center justify-center gap-5 px-6 py-32 text-center">
        <FinaleLine
          as="h2"
          className="text-[clamp(1.5rem,4vw,2.5rem)] leading-[1.3] font-medium text-balance text-foreground"
          text={line1}
          active={activeLine === LINE1}
          showCursor={activeLine === LINE1}
          onDone={() => after(BETWEEN_LINES_MS, () => setActiveLine(LINE2))}
          resetKey={runId}
        />
        <TypewriterLine
          className="relative text-[clamp(1.5rem,4vw,2.5rem)] leading-[1.3] font-medium text-balance text-foreground"
          segments={[{ text: line2Prefix }, { text: line2Highlight, highlighted: true }, { text: line2Suffix }]}
          active={activeLine === LINE2}
          showCursor={activeLine === LINE2}
          onDone={() => after(BETWEEN_LINES_MS, () => setActiveLine(LINE3))}
          srText={`${line2Prefix}${line2Highlight}${line2Suffix}`}
          resetKey={runId}
        />
        <FinaleLine
          className="text-[clamp(1.5rem,4vw,2.5rem)] leading-[1.3] font-medium text-balance text-foreground"
          text={line3}
          active={activeLine === LINE3}
          showCursor={activeLine === LINE3}
          onDone={finishSequence}
          resetKey={runId}
        />
      </div>
      <div ref={boslaPhaseRef} className="flex items-center justify-center px-6 py-32 text-center">
        <span ref={boslaTextRef} className="text-[clamp(3rem,9vw,6rem)] font-bold tracking-tight text-foreground">
          {brand}
        </span>
      </div>
    </section>
  );
}
