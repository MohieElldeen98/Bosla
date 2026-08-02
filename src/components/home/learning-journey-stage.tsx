"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Storytelling, not feature cards: one flowing column of short beats,
 * each settling into place as it's reached — no cards, no icons, no
 * grid. The one visual besides typography is a spine along the start
 * edge that draws itself as the section scrolls, a literal "path"
 * tying back to the compass motif the rest of the page already uses.
 * It's decorative only — under `prefers-reduced-motion` (or no JS) it
 * just sits fully drawn, and every beat is plain, fully visible text
 * from the first paint; nothing here is ever hidden without a reason.
 */
export function LearningJourneyStage({ beats }: { beats: ReactNode[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const spineFillRef = useRef<HTMLDivElement>(null);
  const beatRefs = useRef<Array<HTMLParagraphElement | null>>([]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          spineFillRef.current,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            transformOrigin: "top",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 75%",
              end: "bottom 65%",
              scrub: true,
            },
          },
        );

        beatRefs.current.forEach((el) => {
          if (!el) return;
          gsap.from(el, {
            autoAlpha: 0,
            y: 20,
            duration: 0.7,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
              toggleActions: "play none none reverse",
            },
          });
        });
      });

      return () => mm.revert();
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="mx-auto flex max-w-2xl gap-6 px-6 py-[16vh] sm:gap-10">
      <div className="relative w-px shrink-0 self-stretch bg-border">
        <div ref={spineFillRef} className="absolute inset-x-0 top-0 h-full w-px bg-primary" />
      </div>
      <div className="flex flex-col gap-9 py-2">
        {beats.map((beat, i) => (
          <p
            key={i}
            ref={(el) => {
              beatRefs.current[i] = el;
            }}
            className={
              i === 0 || i === beats.length - 1
                ? "text-2xl leading-snug font-semibold text-balance text-foreground sm:text-3xl"
                : "text-xl leading-relaxed text-pretty text-foreground/90 sm:text-2xl"
            }
          >
            {beat}
          </p>
        ))}
      </div>
    </section>
  );
}
