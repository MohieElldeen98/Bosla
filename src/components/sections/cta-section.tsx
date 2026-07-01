"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  const t = useTranslations("Cta");

  return (
    <section id="pricing" className="relative overflow-hidden bg-neutral-950 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="bg-dot-grid absolute inset-0 [mask-image:radial-gradient(ellipse_60%_80%_at_50%_50%,black,transparent)]" />
        <div className="absolute top-1/2 left-1/2 size-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="relative mx-auto max-w-3xl px-6 py-24 text-center lg:px-8"
      >
        <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("title")}
        </h2>
        <p className="mt-4 text-balance text-white/60">{t("subtitle")}</p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            size="lg"
            className="h-12 px-6 text-base"
            nativeButton={false}
            render={<Link href="/#courses" />}
          >
            {t("primaryCta")}
            <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 border-white/15 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white"
            nativeButton={false}
            render={<Link href="/#faq" />}
          >
            {t("secondaryCta")}
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
