import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/ui/reveal";
import { getHeroIcon } from "@/lib/hero-icons";
import type { FullyResolvedHeroSectionContent } from "@/cms/types/section";

/**
 * Layer 6 — a separate section directly below the Hero: a floating white
 * rounded band with the platform's headline statistics. Entirely CMS-driven
 * (see HeroContent.statistics), icons-only, generously spaced.
 *
 * Server Component (Performance Sprint 3) — previously "use client" solely
 * for Framer Motion's `whileInView`. Always below the fold (the Hero
 * section above it is `min-h-screen`), so unlike `HeroContent` this one
 * genuinely needs scroll-triggered detection — reuses the same `<Reveal>`
 * (Sprint 2) every other decorative section already uses.
 */
export async function TrustBar({
  statistics,
}: {
  statistics: FullyResolvedHeroSectionContent["statistics"];
}) {
  const t = await getTranslations("Hero.trustBar");

  return (
    <section className="relative z-10 mx-auto -mt-12 max-w-5xl px-6 sm:-mt-16 lg:px-8">
      <Reveal className="rounded-3xl bg-white p-8 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.12)] sm:p-10">
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
      </Reveal>
    </section>
  );
}
