import type { CSSProperties } from "react";
import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/ui/reveal";
import { getWhyBoslaIcon } from "@/lib/why-bosla-icons";
import type { Locale } from "@/i18n/routing";

const ITEM_KEYS = [
  "evidence-based",
  "clinical-skills",
  "structured-learning",
  "expert-instructors",
  "bilingual",
  "modern-experience",
] as const;

export async function WhyBoslaSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "WhyKnowledgeOs" });

  return (
    <section className="border-b border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">{t("eyebrow")}</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h2>
          <p className="mt-3 text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ITEM_KEYS.map((key, index) => {
            const Icon = getWhyBoslaIcon(key);
            return (
              <Reveal
                key={key}
                style={{ "--reveal-delay": `${index * 0.06}s` } as CSSProperties}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{t(`items.${key}.title`)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(`items.${key}.description`)}</p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
