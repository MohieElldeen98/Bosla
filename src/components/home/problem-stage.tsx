"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// Depth per fragment — deliberately non-monotonic (not 1, 2, 3, 4) so the
// four lines don't fan out in one predictable direction as they drift;
// it should feel like scattered clutter, not a tidy staircase.
const DRIFT_SPEEDS = [0.5, 1.15, 0.75, 1.3];

// Alternating left/right alone reads as a mechanical L-R-L-R pattern —
// varying how far each one sits from that edge, and how wide it is,
// is what actually sells "scattered" instead of "systematic."
const INDENTS = [0, 8, 3, 12];
const FRAGMENT_WIDTHS = ["max-w-sm", "max-w-md", "max-w-xs", "max-w-lg"];

/**
 * The Problem section's parallax: each fragment drifts upward at its own
 * speed across the whole section (the "clutter" itself), while
 * separately sharpening into focus only as it passes through the
 * viewport's readable band and dissolving again after — one thought
 * legible at a time, never all four at once. The resolution line is the
 * opposite of that motion on purpose: it commits once and holds, instead
 * of staying tied to the scrubbing scroll position, so it *reads* as the
 * moment things stop drifting.
 */
export function ProblemStage({ fragments, resolution }: { fragments: string[]; resolution: string }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const fragmentRefs = useRef<Array<HTMLParagraphElement | null>>([]);
  const resolutionRef = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        fragmentRefs.current.forEach((el, i) => {
          if (!el) return;

          gsap.to(el, {
            y: () => -(DRIFT_SPEEDS[i % DRIFT_SPEEDS.length] * 220),
            ease: "none",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          });

          gsap
            .timeline({
              scrollTrigger: {
                trigger: el,
                start: "top 90%",
                end: "top 15%",
                scrub: true,
              },
            })
            .fromTo(
              el,
              { autoAlpha: 0, filter: "blur(6px)" },
              { autoAlpha: 1, filter: "blur(0px)", ease: "none" },
            )
            .to(el, { autoAlpha: 0, filter: "blur(6px)", ease: "none" });
        });

        gsap.from(resolutionRef.current, {
          autoAlpha: 0,
          y: 24,
          filter: "blur(8px)",
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: resolutionRef.current,
            start: "top 78%",
            toggleActions: "play none none reverse",
          },
        });
      });

      return () => mm.revert();
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="dark relative isolate overflow-hidden bg-background px-6 py-[26vh]">
      <div aria-hidden="true" className="night-sky-nebula" />
      <div aria-hidden="true" className="fade-to-daylight h-[55vh]" />

      <div className="relative mx-auto flex max-w-4xl flex-col gap-[15vh]">
        {fragments.map((fragment, i) => (
          <div
            key={fragment}
            className={`flex w-full ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
            style={{ [i % 2 === 0 ? "paddingInlineStart" : "paddingInlineEnd"]: `${INDENTS[i % INDENTS.length]}%` }}
          >
            <p
              ref={(el) => {
                fragmentRefs.current[i] = el;
              }}
              className={`${FRAGMENT_WIDTHS[i % FRAGMENT_WIDTHS.length]} text-2xl font-medium text-balance text-muted-foreground will-change-transform sm:text-3xl`}
            >
              {fragment}
            </p>
          </div>
        ))}

        <h2
          ref={resolutionRef}
          className="mx-auto mt-[10vh] max-w-2xl text-center text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl"
        >
          {resolution}
        </h2>
      </div>
    </section>
  );
}
