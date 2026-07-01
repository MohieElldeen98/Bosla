"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { CheckCircle2, CircleDashed, Play } from "lucide-react";

const capabilityKeys = [
  "capabilityPlayer",
  "capabilityProgress",
  "capabilityResources",
  "capabilityCertificates",
] as const;

const chapterKeys = [
  { key: "intro", state: "done" as const },
  { key: "compound", state: "current" as const },
  { key: "renderProps", state: "upcoming" as const },
  { key: "shipping", state: "upcoming" as const },
];

export function LearningExperience() {
  const t = useTranslations("LearningExperience");

  return (
    <section id="learning-experience" className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
      <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            {t("eyebrow")}
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>

          <ul className="mt-8 space-y-4">
            {capabilityKeys.map((key) => (
              <li key={key} className="flex items-start gap-3">
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-primary"
                />
                <span className="text-sm text-foreground">{t(key)}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          aria-hidden="true"
          className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl ring-1 ring-foreground/5"
        >
          <div className="flex flex-col lg:flex-row">
            <div className="relative flex aspect-video flex-1 items-center justify-center bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600">
              <span className="flex size-14 items-center justify-center rounded-full bg-white/90 shadow-lg">
                <Play className="ml-1 size-6 fill-neutral-900 text-neutral-900" />
              </span>
              <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-black/30 px-4 py-2.5">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25">
                  <div className="h-full w-[38%] rounded-full bg-white" />
                </div>
                <span className="text-xs font-medium text-white">
                  {t("previewTimestamp")}
                </span>
              </div>
            </div>

            <div className="w-full border-t border-border p-4 lg:w-60 lg:border-t-0 lg:border-s">
              <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {t("chaptersLabel")}
              </p>
              <ul className="space-y-3">
                {chapterKeys.map((chapter) => (
                  <li key={chapter.key} className="flex items-start gap-2.5">
                    {chapter.state === "done" ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    ) : chapter.state === "current" ? (
                      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                        <span className="size-2.5 rounded-full bg-primary" />
                      </span>
                    ) : (
                      <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
                    )}
                    <span
                      className={`text-sm ${
                        chapter.state === "current"
                          ? "font-medium text-foreground"
                          : chapter.state === "upcoming"
                            ? "text-muted-foreground"
                            : "text-foreground"
                      }`}
                    >
                      {t(`chapters.${chapter.key}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
