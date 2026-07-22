"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { HeroBackground } from "@/components/sections/hero/HeroBackground";
import { HeroContent } from "@/components/sections/hero/HeroContent";
import { HeroPortrait } from "@/components/sections/hero/HeroPortrait";
import { FloatingInstructorCard } from "@/components/sections/hero/FloatingInstructorCard";
import { HeroNavigation } from "@/components/sections/hero/HeroNavigation";
import { TrustBar } from "@/components/sections/hero/TrustBar";
import type { FullyResolvedHeroSectionContent } from "@/cms/types/section";

const AUTOPLAY_INTERVAL_MS = 6000;

/**
 * The Hero, composed of independent layers (Background, Content, Portrait,
 * FloatingInstructorCard, Navigation) plus the TrustBar section directly
 * beneath it. Only the portrait/card/instructor-info layer slides — the
 * headline, description, CTAs, and highlights are stable. Everything is
 * sourced from HomepageService.getSections() → HeroContent, never hardcoded.
 */
export function Hero({ content }: { content: FullyResolvedHeroSectionContent }) {
  const t = useTranslations("Hero.instructorShowcase");
  const prefersReducedMotion = useReducedMotion();

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { slides } = content;

  const goTo = useCallback(
    (nextIndex: number) => setIndex((nextIndex + slides.length) % slides.length),
    [slides.length],
  );
  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (paused || prefersReducedMotion || slides.length <= 1) return;
    timerRef.current = setInterval(goNext, AUTOPLAY_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [goNext, paused, prefersReducedMotion, slides.length]);

  const slide = slides[index];

  return (
    <>
      <section
        className="relative flex min-h-screen flex-col justify-center overflow-hidden py-24 lg:py-16"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <HeroBackground />

        <div className="relative mx-auto grid w-full max-w-[1440px] gap-16 px-6 lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-16 xl:px-24">
          <HeroContent content={content} />

          {slide && (
            <div className="relative">
              <div aria-live="polite" className="sr-only">
                {t("slideStatus", {
                  current: index + 1,
                  total: slides.length,
                  name: slide.instructor.nameEn,
                })}
              </div>

              {/* Portrait viewport — shorter on mobile since the card sits
                  below it there instead of floating on top (see the card
                  wrapper below), avoiding the card swallowing the portrait
                  on small screens. */}
              <div className="relative h-[15rem] sm:h-[30rem] lg:h-[36rem] xl:h-[42rem]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={slide.id}
                    className="absolute inset-0"
                    initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
                    transition={{ duration: prefersReducedMotion ? 0.2 : 0.6, ease: "easeInOut" }}
                  >
                    {slide.instructor.image && (
                      <HeroPortrait image={slide.instructor.image} priority={index === 0} />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="relative mt-4 flex justify-center sm:absolute sm:bottom-0 sm:start-0 sm:mt-0 sm:block">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={slide.id}
                    initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                    transition={{ duration: prefersReducedMotion ? 0.2 : 0.5, delay: 0.1 }}
                  >
                    <FloatingInstructorCard instructor={slide.instructor} />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        <HeroNavigation
          count={slides.length}
          index={index}
          onGoTo={goTo}
          onPrev={goPrev}
          onNext={goNext}
          labels={{
            previous: t("previousSlide"),
            next: t("nextSlide"),
            chooseInstructor: t("chooseInstructor"),
            goTo: (position) =>
              t("goToSlide", { name: slides[position - 1]?.instructor.nameEn ?? "" }),
          }}
        />
      </section>

      <TrustBar statistics={content.statistics} />
    </>
  );
}
