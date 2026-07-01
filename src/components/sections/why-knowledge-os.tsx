"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { features } from "@/data/features";

export function WhyKnowledgeOs() {
  const t = useTranslations("WhyKnowledgeOs");

  return (
    <section id="about" className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            {t("eyebrow")}
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-3 text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.4, delay: index * 0.06 }}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <feature.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-semibold">
                {t(`items.${feature.id}.title`)}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(`items.${feature.id}.description`)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
