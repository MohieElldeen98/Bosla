"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * The one section on the page with no continuous or scrubbed motion —
 * everything here commits once and holds, on purpose. After the Problem
 * section's restless drift, stillness itself is the signal that the
 * page has landed somewhere solid.
 *
 * Deliberately start-aligned rather than centered — Hero and Vision
 * both use a centered muted-line-then-bold-headline layout as an
 * intentional callback to each other; this section sits between them
 * and needs its own shape, or the page reads as one template repeated
 * three times.
 */
export function BoslaExistsStage({ intro, headline }: { intro: string; headline: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const introRef = useRef<HTMLParagraphElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap
          .timeline({
            defaults: { ease: "power2.out" },
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 70%",
              toggleActions: "play none none reverse",
            },
          })
          .from(introRef.current, { autoAlpha: 0, y: 14, duration: 0.7 })
          .from(
            headlineRef.current,
            { autoAlpha: 0, y: 20, filter: "blur(6px)", duration: 1 },
            "-=0.35",
          );
      });

      return () => mm.revert();
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-[18vh]">
      <p ref={introRef} className="text-base font-medium text-muted-foreground">
        {intro}
      </p>
      <h2
        ref={headlineRef}
        className="text-[clamp(1.875rem,4.5vw,3rem)] leading-[1.1] font-bold tracking-tight text-balance text-foreground"
      >
        {headline}
      </h2>
    </section>
  );
}
