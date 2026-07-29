import { useTranslations } from "next-intl";
import { Button } from "@heroui/react";
import { Link } from "@/i18n/navigation";

export function ContactCtaSection() {
  const t = useTranslations("ContactCta");

  return (
    <section className="bg-foreground py-16">
      <div className="mx-auto max-w-2xl px-6 text-center lg:px-8">
        <h2 className="text-2xl font-bold text-background sm:text-3xl">{t("title")}</h2>
        <p className="mt-3 text-background/70">{t("subtitle")}</p>
        <Button
          className="mt-8"
          render={(props) => <Link {...(props as React.ComponentPropsWithoutRef<typeof Link>)} href="/contact" />}
        >
          {t("buttonLabel")}
        </Button>
      </div>
    </section>
  );
}
