"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { getHeroIcon } from "@/lib/hero-icons";
import type { FullyResolvedHeroSectionContent } from "@/cms/types/section";

/**
 * Layer 6 — a separate section directly below the Hero: a floating white
 * rounded band with the platform's headline statistics. Entirely CMS-driven
 * (see HeroContent.statistics), icons-only, generously spaced.
 */
export function TrustBar({
  statistics,
}: {
  statistics: FullyResolvedHeroSectionContent["statistics"];
}) {
  const t = useTranslations("Hero.trustBar");

  return (
    <section className="relative z-10 mx-auto -mt-12 max-w-5xl px-6 sm:-mt-16 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="rounded-3xl bg-white p-8 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.12)] sm:p-10"
      >
        <p className="text-center text-lg font-semibold text-slate-900 sm:text-xl">
          {t("title")}
        </p>
        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
          {statistics.map((statistic) => {
            const Icon = getHeroIcon(statistic.icon);
            return (
              <div
                key={statistic.id}
                className="flex flex-col items-center gap-2 text-center"
              >
                <Icon aria-hidden="true" className="size-6 text-primary" />
                <dd className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                  {statistic.value}
                </dd>
                <dt className="text-xs text-slate-500 sm:text-sm">
                  {statistic.label}
                </dt>
              </div>
            );
          })}
        </dl>
      </motion.div>
    </section>
  );
}
