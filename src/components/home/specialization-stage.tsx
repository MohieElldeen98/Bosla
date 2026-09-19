"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ChevronDown } from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface Specialty {
  name: string;
  tagline: string;
}

/** Scroll pixels allocated per relative "timeline second" — tunes how
 *  much physical scrolling one beat of the sequence takes. The pin's
 *  length is derived from the timeline's real duration (not a per-slide
 *  guess), so this is the one dial for the whole sequence's pace. */
const PX_PER_UNIT = 380;

/** How far a settled slide keeps drifting while it's being read. A hold
 *  used to be a frozen frame: ~640px of scrolling with nothing on screen
 *  changing, which on a phone is a whole swipe — visitors concluded the
 *  page had ended and left. Any scroll now produces visible motion. */
const DRIFT = { scale: 1.045, y: -14 };

const SLIDE_CLASS = "flex flex-col items-center justify-center gap-4 px-6 py-24 text-center will-change-transform";

/** Where the incoming slide starts, and where the outgoing one ends up —
 *  identical in every property except *sign* (below vs. above, forward-
 *  tilted vs. back-tilted), which is what makes the two directions read
 *  as opposites of the same depth motion rather than two unrelated
 *  effects. Never `x` — the brief is explicit that this never moves
 *  horizontally. */
const FROM_BELOW = { autoAlpha: 0, scale: 0.82, y: 56, rotateX: 10, filter: "blur(14px)" };
const TO_ABOVE = { autoAlpha: 0, scale: 0.85, y: -44, rotateX: -8, filter: "blur(12px)" };
const SETTLED = { autoAlpha: 1, scale: 1, y: 0, rotateX: 0, filter: "blur(0px)" };

/**
 * The signature moment. A single pinned viewport with both intro lines
 * and every specialty stacked on top of each other and initially
 * hidden — GSAP converts them to that overlapping stack itself, on
 * mount, only when motion is allowed. Without JS or under
 * `prefers-reduced-motion`, none of that ever happens: every slide
 * stays in normal document flow, so what a reduced-motion visitor gets
 * is a plain, fully readable list of the same content — never a pile
 * of invisible overlapping text.
 *
 * Ends on the last specialty, holding — the story's actual closing
 * scene (silence, a typewriter question, the brand) is its own later
 * section (`FinaleSection`), not appended here. It used to live inside
 * this component, which buried the page's emotional climax in the
 * middle of the page instead of at the end.
 */
export function SpecializationStage({
  introLine1,
  introLine2,
  specialties,
}: {
  introLine1: string;
  introLine2: string;
  specialties: Specialty[];
}) {
  const pinRef = useRef<HTMLElement>(null);
  const layerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const segmentFillRefs = useRef<Array<HTMLSpanElement | null>>([]);

  const introCount = 2;
  const specialtyStart = introCount;
  const slideCount = specialtyStart + specialties.length;

  function holdFor(i: number): number {
    if (i < introCount) return 0.9;
    return 1.4; // specialties get the most reading time
  }

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const layers = layerRefs.current.filter((el): el is HTMLDivElement => el !== null);
        if (layers.length !== slideCount || !pinRef.current) return () => {};

        gsap.set(pinRef.current, { height: "100dvh", overflow: "hidden" });
        gsap.set(layers, { position: "absolute", inset: 0 });
        // A scrubbed timeline only *renders* a tween once the scroll
        // progress actually reaches it — at rest (progress 0), every
        // fromTo() beyond the first is still an inert instruction, not
        // yet-applied styles. Without setting the hidden state up front,
        // slides 1..N would all sit at their plain CSS default (fully
        // opaque) stacked on top of slide 0 the instant the pin engages —
        // exactly the "multiple specialties at once" the brief forbids.
        gsap.set(layers.slice(1), FROM_BELOW);
        gsap.set(layers[0], SETTLED);

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: pinRef.current,
            start: "top top",
            end: () => `+=${tl.duration() * PX_PER_UNIT}`,
            pin: true,
            // Lower than the old 1s lag: the first thing a swipe should
            // produce is movement, not a pause before movement.
            scrub: 0.5,
            invalidateOnRefresh: true,
          },
        });

        const enterAt: number[] = [];
        const settleAt: number[] = [];
        layers.forEach((el, i) => {
          const enterPos = i === 0 ? undefined : "-=0.35";
          const enterDuration = i === 0 ? 0.7 : 0.9;
          tl.fromTo(el, FROM_BELOW, { ...SETTLED, duration: enterDuration, ease: "power2.out" }, enterPos);
          enterAt.push(tl.duration() - enterDuration);
          settleAt.push(tl.duration());
          const isLast = i === slideCount - 1;
          // The last slide still gets a (shorter) hold so the progress
          // rail visibly completes before the pin releases.
          tl.to(el, { ...DRIFT, duration: isLast ? 0.6 : holdFor(i), ease: "none" });
          if (!isLast) tl.to(el, { ...TO_ABOVE, duration: 0.85, ease: "power2.in" });
        });

        // Progress rail: one segment per specialty, each filling across
        // its own slide's whole span — so it moves on every scroll tick,
        // and the unfilled segments say "there's more below" outright.
        const indicator = indicatorRef.current;
        const fills = segmentFillRefs.current.filter((el): el is HTMLSpanElement => el !== null);
        if (indicator && fills.length === specialties.length) {
          // Fill from the reading direction's start edge. Set here rather
          // than with Tailwind's `rtl:` variant, whose `:dir()` selector
          // older Safari doesn't parse.
          const rtl = getComputedStyle(pinRef.current).direction === "rtl";
          gsap.set(fills, { scaleX: 0, transformOrigin: rtl ? "right center" : "left center" });
          tl.fromTo(indicator, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, enterAt[specialtyStart]);
          fills.forEach((fill, i) => {
            const from = enterAt[specialtyStart + i];
            const to = i === fills.length - 1 ? tl.duration() : enterAt[specialtyStart + i + 1];
            tl.fromTo(fill, { scaleX: 0 }, { scaleX: 1, duration: to - from, ease: "none" }, from);
          });
          if (hintRef.current) {
            tl.to(hintRef.current, { autoAlpha: 0, duration: 0.3 }, settleAt[slideCount - 1] - 0.3);
          }

          // Written straight to the DOM on every tick — a React state
          // update per scroll frame would re-render the whole stage.
          let shown = -1;
          tl.eventCallback("onUpdate", () => {
            const time = tl.time();
            let active = 0;
            for (let i = 0; i < specialties.length; i++) {
              if (time >= enterAt[specialtyStart + i] + 0.45) active = i;
            }
            if (active !== shown && counterRef.current) {
              shown = active;
              counterRef.current.textContent = String(active + 1).padStart(2, "0");
            }
          });
        }

        // `end` reads `tl.duration()`, which was 0 when the trigger was
        // created alongside the empty timeline — measure again now.
        tl.scrollTrigger?.refresh();

        return () => {
          tl.scrollTrigger?.kill();
          tl.kill();
        };
      });

      return () => mm.revert();
    },
    { scope: pinRef, dependencies: [specialties.length] },
  );

  return (
    <section ref={pinRef} className="relative" style={{ perspective: "1400px" }}>
      <div
        ref={(el) => {
          layerRefs.current[0] = el;
        }}
        className={SLIDE_CLASS}
      >
        <p className="text-[clamp(1.5rem,3.5vw,2.5rem)] leading-[1.2] font-medium text-balance text-muted-foreground">
          {introLine1}
        </p>
      </div>
      <div
        ref={(el) => {
          layerRefs.current[1] = el;
        }}
        className={SLIDE_CLASS}
      >
        <h2 className="text-[clamp(2rem,5.5vw,4rem)] leading-[1.1] font-bold tracking-tight text-balance text-foreground">
          {introLine2}
        </h2>
      </div>

      {specialties.map((specialty, i) => (
        <div
          key={specialty.name}
          ref={(el) => {
            layerRefs.current[specialtyStart + i] = el;
          }}
          className={SLIDE_CLASS}
        >
          <h3 className="text-[clamp(3rem,10vw,8rem)] leading-[1] font-bold tracking-tight text-balance text-foreground">
            {specialty.name}
          </h3>
          <p className="text-[clamp(1.125rem,2.2vw,1.5rem)] text-muted-foreground">{specialty.tagline}</p>
        </div>
      ))}

      {/* Starts `invisible`: only the animated path ever reveals it. In
          the reduced-motion / no-JS list there's nothing to track. The
          track and fill are separate layers with plain `opacity` rather
          than a `/20` color modifier — that compiles to `color-mix()`,
          which Safari 15 drops (see CLAUDE.md). */}
      <div
        ref={indicatorRef}
        aria-hidden="true"
        className="invisible absolute inset-x-0 bottom-[max(2rem,env(safe-area-inset-bottom))] z-10 flex flex-col items-center gap-3 opacity-0"
      >
        <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground tabular-nums" dir="ltr">
          <span ref={counterRef} className="text-foreground">
            01
          </span>
          <span className="opacity-50">/</span>
          <span>{String(specialties.length).padStart(2, "0")}</span>
        </div>
        <div className="flex gap-1.5">
          {specialties.map((specialty, i) => (
            <span key={specialty.name} className="relative h-1 w-7 overflow-hidden rounded-full sm:w-10">
              <span className="absolute inset-0 bg-foreground opacity-20" />
              <span
                ref={(el) => {
                  segmentFillRefs.current[i] = el;
                }}
                className="absolute inset-0 bg-foreground"
              />
            </span>
          ))}
        </div>
        <div ref={hintRef} className="text-muted-foreground">
          <ChevronDown className="size-5 animate-bounce" />
        </div>
      </div>
    </section>
  );
}
