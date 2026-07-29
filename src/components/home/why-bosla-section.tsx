import { getTranslations } from "next-intl/server";
import { BookOpen, Stethoscope, Languages, ListChecks } from "lucide-react";
import type { Locale } from "@/i18n/routing";

const ITEMS = [
  { key: "evidence-based", icon: BookOpen },
  { key: "expert-instructors", icon: Stethoscope },
  { key: "bilingual", icon: Languages },
  { key: "structured-learning", icon: ListChecks },
] as const;

export async function WhyBoslaSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "WhyKnowledgeOs" });

  return (
    <section className="mx-auto max-w-6xl px-6 py-20 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold text-accent">{t("eyebrow")}</p>
        <h2 className="mt-2 text-3xl font-bold text-balance text-foreground">{t("title")}</h2>
        <p className="mt-4 text-pretty text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2">
        {ITEMS.map(({ key, icon: Icon }) => (
          <div key={key} className="flex gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h3 className="font-semibold text-foreground">{t(`items.${key}.title`)}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t(`items.${key}.description`)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
