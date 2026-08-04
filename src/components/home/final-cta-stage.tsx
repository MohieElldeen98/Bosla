"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * The quietest section on the page, deliberately — more whitespace
 * than anywhere else, one sentence, one button, one calm settle-in
 * reveal. No countdown, no "limited spots," no exclamation marks: the
 * brief is explicit that the visitor should feel ready, not rushed.
 */
export function FinalCtaStage({ line, cta }: { line: string; cta: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const lineRef = useRef<HTMLHeadingElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap
          .timeline({
            defaults: { ease: "power3.out" },
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 70%",
              toggleActions: "play none none reverse",
            },
          })
          .from(lineRef.current, { autoAlpha: 0, y: 16, duration: 0.85 })
          .from(ctaRef.current, { autoAlpha: 0, y: 12, duration: 0.7 }, "-=0.35");
      });

      return () => mm.revert();
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      className="mx-auto flex max-w-xl flex-col items-center gap-8 px-6 py-[30vh] text-center"
    >
      <h2 ref={lineRef} className="text-2xl font-medium text-balance text-foreground sm:text-3xl">
        {line}
      </h2>
      <div ref={ctaRef}>
        <Link
          href="/courses"
          className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-full px-8 text-base")}
        >
          {cta}
        </Link>
      </div>
    </section>
  );
}
