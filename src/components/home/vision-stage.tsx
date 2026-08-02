"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * The whole point of this section is restraint — it's the shortest,
 * plainest one on the page, on purpose. One settle-in reveal, no
 * scrub, no pin, no decorative element. Whitespace around it does the
 * rest of the work.
 */
export function VisionStage({ line1, line2 }: { line1: string; line2: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const line1Ref = useRef<HTMLParagraphElement>(null);
  const line2Ref = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const reveal = gsap.timeline({
          defaults: { ease: "power3.out" },
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 65%",
            toggleActions: "play none none reverse",
          },
        });
        reveal
          .from(line1Ref.current, { autoAlpha: 0, y: 16, duration: 0.6 })
          .from(
            line2Ref.current,
            { autoAlpha: 0, y: 26, scale: 0.96, filter: "blur(6px)", duration: 0.9 },
            "-=0.25",
          );
      });

      return () => mm.revert();
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 py-[22vh] text-center"
    >
      <p ref={line1Ref} className="text-lg font-medium text-muted-foreground sm:text-xl">
        {line1}
      </p>
      <h2
        ref={line2Ref}
        className="text-[clamp(2.25rem,6vw,4.5rem)] leading-[1.08] font-bold tracking-tight text-balance text-foreground"
      >
        {line2}
      </h2>
    </section>
  );
}
