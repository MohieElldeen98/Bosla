"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface Specialty {
  name: string;
  tagline: string;
}

/** Scroll pixels allocated per relative "timeline second" — tunes how
 *  much physical scrolling one beat of the sequence takes. */
const PX_PER_UNIT = 550;

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
            end: () => `+=${slideCount * 2 * PX_PER_UNIT}`,
            pin: true,
            scrub: 1,
          },
        });

        layers.forEach((el, i) => {
          const enterPos = i === 0 ? undefined : "-=0.35";
          tl.fromTo(el, FROM_BELOW, { ...SETTLED, duration: i === 0 ? 0.7 : 0.9, ease: "power2.out" }, enterPos);
          if (i < slideCount - 1) {
            tl.to(el, { ...TO_ABOVE, duration: 0.85, ease: "power2.in" }, `+=${holdFor(i)}`);
          }
        });

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
    </section>
  );
}
