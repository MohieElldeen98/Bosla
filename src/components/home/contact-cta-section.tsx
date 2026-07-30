import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export async function ContactCtaSection({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "ContactCta" });

  return (
    <section className="bg-foreground py-16">
      <div className="mx-auto max-w-2xl px-6 text-center lg:px-8">
        <h2 className="text-2xl font-bold text-background sm:text-3xl">{t("title")}</h2>
        <p className="mt-3 text-background/70">{t("subtitle")}</p>
        <Link
          href="/contact"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-background px-6 text-sm font-semibold text-foreground transition-colors hover:bg-background/90"
        >
          {t("buttonLabel")}
        </Link>
      </div>
    </section>
  );
}
