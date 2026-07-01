"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  BookOpen,
  Flame,
  LayoutDashboard,
  MessageSquare,
  Play,
  Settings,
} from "lucide-react";

const sidebarIcons = [
  LayoutDashboard,
  BookOpen,
  BarChart3,
  MessageSquare,
  Settings,
];

const weeklyActivity = [
  { day: "M", value: 40 },
  { day: "T", value: 65 },
  { day: "W", value: 50 },
  { day: "T", value: 80 },
  { day: "F", value: 60 },
  { day: "S", value: 95 },
  { day: "S", value: 70 },
];

export function DashboardPreview() {
  const t = useTranslations("Hero.dashboardPreview");

  const stats = [
    { label: t("statHours"), value: "14.5h" },
    { label: t("statCoursesInProgress"), value: "3" },
    { label: t("statCompletionRate"), value: "86%" },
  ];

  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
      className="relative mx-auto w-full max-w-lg lg:mx-0"
    >
      {/* Main dashboard window */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 shadow-2xl shadow-black/40">
        <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.03] px-4 py-3">
          <span className="size-2.5 rounded-full bg-red-400/70" />
          <span className="size-2.5 rounded-full bg-amber-400/70" />
          <span className="size-2.5 rounded-full bg-emerald-400/70" />
          <span className="ms-3 text-xs font-medium text-white/40">
            {t("windowTitle")}
          </span>
        </div>

        <div className="flex">
          <div className="flex flex-col items-center gap-3 border-e border-white/10 px-3 py-4">
            {sidebarIcons.map((Icon, index) => (
              <span
                key={index}
                className={`flex size-8 items-center justify-center rounded-lg ${
                  index === 0
                    ? "bg-primary text-primary-foreground"
                    : "text-white/35"
                }`}
              >
                <Icon className="size-4" />
              </span>
            ))}
          </div>

          <div className="flex-1 space-y-4 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-white">
                {t("welcomeBack")}
              </p>
              <span className="flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-medium text-orange-300">
                <Flame className="size-3" />
                {t("streak")}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5"
                >
                  <p className="text-sm font-semibold text-white">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-tight text-white/40">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center gap-3">
                <div className="size-10 shrink-0 rounded-md bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-white">
                    {t("continueLearningCourse")}
                  </p>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[72%] rounded-full bg-primary" />
                  </div>
                </div>
                <span className="text-xs font-medium text-white/50">72%</span>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <p className="mb-2 text-[10px] font-medium text-white/40">
                {t("weeklyActivity")}
              </p>
              <div className="flex h-16 items-end gap-2">
                {weeklyActivity.map((day, index) => (
                  <div
                    key={index}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <div className="flex h-12 w-full items-end overflow-hidden rounded-sm bg-white/5">
                      <div
                        className="w-full rounded-sm bg-primary/70"
                        style={{ height: `${day.value}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-white/30">
                      {day.day}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating lesson reader preview */}
      <div className="absolute -bottom-8 -start-6 hidden w-48 -rotate-3 overflow-hidden rounded-xl border border-white/10 bg-neutral-900 shadow-2xl shadow-black/50 sm:block rtl:rotate-3">
        <div className="flex items-center gap-1 border-b border-white/10 bg-white/[0.03] px-3 py-2">
          <span className="size-1.5 rounded-full bg-white/20" />
          <span className="size-1.5 rounded-full bg-white/20" />
          <span className="ms-1 text-[9px] font-medium text-white/40">
            {t("lessonPreviewLabel")}
          </span>
        </div>
        <div className="relative flex h-20 items-center justify-center bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-500">
          <span className="flex size-8 items-center justify-center rounded-full bg-white/90">
            <Play className="ml-0.5 size-3.5 fill-neutral-900 text-neutral-900" />
          </span>
        </div>
        <div className="p-2.5">
          <p className="text-[10px] font-medium text-white">
            {t("lessonPreviewTitle")}
          </p>
          <p className="mt-1 text-[9px] text-white/40">12:34 / 18:20</p>
        </div>
      </div>
    </motion.div>
  );
}
