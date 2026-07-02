"use client";

import { motion } from "framer-motion";
import { ChevronRight, PlayCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { getHeroIcon } from "@/lib/hero-icons";
import type { FullyResolvedHeroSectionContent } from "@/cms/types/section";

/**
 * Layer 2 — the stable value proposition. Does not change as the portrait
 * slider advances; every string is CMS content resolved by HomepageService,
 * never hardcoded in this component.
 */
export function HeroContent({
  content,
}: {
  content: Pick<
    FullyResolvedHeroSectionContent,
    | "eyebrow"
    | "headlineLine1"
    | "headlineLine2"
    | "headlineLine3"
    | "description"
    | "primaryButton"
    | "secondaryButton"
    | "highlights"
  >;
}) {
  return (
    <div className="flex flex-col items-center text-center lg:items-start lg:text-start">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-4 py-1.5 text-sm font-medium text-sky-700"
      >
        <span className="size-1.5 rounded-full bg-sky-500" />
        {content.eyebrow}
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="max-w-[620px] text-balance text-5xl leading-[1.08] font-semibold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl"
      >
        {content.headlineLine1}
        <br />
        <span className="bg-gradient-to-r from-primary to-teal-600 bg-clip-text text-transparent">
          {content.headlineLine2}
          <br />
          {content.headlineLine3}
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-8 max-w-[520px] text-balance text-lg leading-relaxed text-slate-600"
      >
        {content.description}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
      >
        <Button
          size="lg"
          className="h-[3.25rem] rounded-full px-7 text-base"
          nativeButton={false}
          render={<Link href={content.primaryButton.href} />}
        >
          {content.primaryButton.label}
          <ChevronRight aria-hidden="true" className="size-4 rtl:rotate-180" />
        </Button>
        {content.secondaryButton && (
          <Button
            size="lg"
            variant="outline"
            className="h-[3.25rem] rounded-full border-slate-200 px-7 text-base text-slate-700 hover:bg-slate-50"
            nativeButton={false}
            render={<Link href={content.secondaryButton.href} />}
          >
            <PlayCircle aria-hidden="true" className="size-4" />
            {content.secondaryButton.label}
          </Button>
        )}
      </motion.div>

      <motion.ul
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-14 grid w-full max-w-[520px] grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4 sm:gap-x-4"
      >
        {content.highlights.map((highlight) => {
          const Icon = getHeroIcon(highlight.icon);
          return (
            <li
              key={highlight.id}
              className="flex flex-col items-center gap-2 text-center sm:items-start sm:text-start"
            >
              <Icon aria-hidden="true" className="size-5 text-primary" />
              <span className="text-xs leading-snug font-medium text-slate-600 sm:text-sm">
                {highlight.label}
              </span>
            </li>
          );
        })}
      </motion.ul>
    </div>
  );
}
