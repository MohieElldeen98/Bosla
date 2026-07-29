import { useTranslations } from "next-intl";
import { Button } from "@heroui/react";
import { Link } from "@/i18n/navigation";

export function HeroSection() {
  const t = useTranslations("Hero");

  return (
    <section className="mx-auto max-w-4xl px-6 py-24 text-center lg:px-8 lg:py-32">
      <h1 className="text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
        {t("headline")}
      </h1>
      <p className="mt-6 text-lg text-pretty text-muted-foreground">{t("subhead")}</p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Button render={(props) => <Link {...(props as React.ComponentPropsWithoutRef<typeof Link>)} href="/courses" />}>
          {t("primaryCta")}
        </Button>
        <Button
          variant="outline"
          render={(props) => <Link {...(props as React.ComponentPropsWithoutRef<typeof Link>)} href="/sign-up" />}
        >
          {t("secondaryCta")}
        </Button>
      </div>
    </section>
  );
}
