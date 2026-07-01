"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowRight, PlayCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { DashboardPreview } from "@/components/sections/dashboard-preview";

const stats = [
  { key: "statsStudents", value: "48k+" },
  { key: "statsCourses", value: "320+" },
  { key: "statsRating", value: "4.9/5" },
] as const;

export function HeroSection() {
  const t = useTranslations("Hero");

  return (
    <section className="relative overflow-hidden bg-neutral-950 pb-24 text-white sm:pb-28">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="bg-dot-grid absolute inset-0 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,black,transparent)]" />
        <div className="absolute top-[-12rem] start-1/4 size-[28rem] rounded-full bg-primary/25 blur-[110px]" />
        <div className="absolute top-[-6rem] end-1/4 size-[24rem] rounded-full bg-fuchsia-500/15 blur-[110px]" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-16 px-6 pt-20 lg:grid-cols-2 lg:items-center lg:pt-28 lg:px-8">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-start">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm font-medium text-white/70"
          >
            <span className="size-1.5 rounded-full bg-emerald-400" />
            {t("eyebrow")}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="max-w-xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl"
          >
            {t("titlePrefix")}{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              {t("titleHighlight")}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-6 max-w-lg text-balance text-lg text-white/60"
          >
            {t("subtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
          >
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
              render={<Link href="/#learning-experience" />}
            >
              <PlayCircle className="size-4" />
              {t("secondaryCta")}
            </Button>
          </motion.div>
        </div>

        <DashboardPreview />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="relative z-10 mx-auto mt-20 max-w-4xl px-6 sm:mt-24 lg:px-8"
      >
        <dl className="grid grid-cols-3 divide-x divide-white/10 rtl:divide-x-reverse rounded-2xl border border-white/10 bg-white/[0.04] text-center text-white shadow-xl backdrop-blur-sm">
          {stats.map((stat) => (
            <div key={stat.key} className="px-4 py-6">
              <dd className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {stat.value}
              </dd>
              <dt className="mt-1 text-xs text-white/50 sm:text-sm">
                {t(stat.key)}
              </dt>
            </div>
          ))}
        </dl>
      </motion.div>
    </section>
  );
}
