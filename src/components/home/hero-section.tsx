import type { CSSProperties } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CompassMark } from "@/components/home/compass-mark";
import { NightSky } from "@/components/home/night-sky";
import type { Locale } from "@/i18n/routing";

export async function HeroSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Hero" });

  return (
    <section className="hero-gradient relative overflow-hidden">
      <NightSky />
      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:px-8 lg:py-28">
        <div>
          <p
            className="hero-reveal hero-trust-text text-sm font-semibold tracking-wide uppercase"
            style={{ "--reveal-delay": "0s" } as CSSProperties}
          >
            {t("trustBar.title")}
          </p>
          <h1
            className="hero-reveal hero-heading-text mt-4 text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]"
            style={{ "--reveal-delay": "0.06s" } as CSSProperties}
          >
            {t("headline")}
          </h1>
          <p
            className="hero-reveal hero-subhead-text mt-6 max-w-xl text-lg text-pretty"
            style={{ "--reveal-delay": "0.12s" } as CSSProperties}
          >
            {t("subhead")}
          </p>
          <div
            className="hero-reveal mt-10 flex flex-wrap items-center gap-3"
            style={{ "--reveal-delay": "0.18s" } as CSSProperties}
          >
            <Link
              href="/courses"
              className="hero-btn-primary inline-flex h-11 items-center justify-center rounded-lg px-6 text-sm font-semibold"
            >
              {t("primaryCta")}
            </Link>
            <Link
              href="/sign-up"
              className="hero-btn-secondary inline-flex h-11 items-center justify-center rounded-lg border px-6 text-sm font-semibold"
            >
              {t("secondaryCta")}
            </Link>
          </div>
        </div>

        <div
          className="hero-reveal relative mx-auto aspect-square w-full max-w-md lg:max-w-none"
          style={{ "--reveal-delay": "0.1s" } as CSSProperties}
        >
          <CompassMark className="size-full" />
        </div>
      </div>
    </section>
  );
}
