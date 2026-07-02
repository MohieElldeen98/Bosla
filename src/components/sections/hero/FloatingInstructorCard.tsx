"use client";

import { Award, BookOpen, ChevronRight, GraduationCap, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import type { ResolvedInstructorSlide } from "@/types/instructor";

/**
 * Layer 4 — a small, elegant glassmorphism card floating above the portrait.
 * Entirely CMS-driven: every field comes from the resolved InstructorSlide,
 * nothing hardcoded.
 */
export function FloatingInstructorCard({
  instructor,
}: {
  instructor: ResolvedInstructorSlide;
}) {
  const t = useTranslations("Hero.instructorShowcase");
  const locale = useLocale() as Locale;
  const primaryName = locale === "ar" ? instructor.nameAr : instructor.nameEn;
  const secondaryName = locale === "ar" ? instructor.nameEn : instructor.nameAr;

  return (
    <div className="w-[calc(100vw-3rem)] max-w-[19rem] rounded-2xl bg-white/70 p-5 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.25)] ring-1 ring-white/60 backdrop-blur-xl sm:p-6">
      <p className="text-xs font-semibold tracking-wide text-primary uppercase">
        {t("currentInstructor")}
      </p>
      <h3 className="mt-1.5 text-lg font-semibold text-slate-900 sm:text-xl">
        {primaryName}
      </h3>
      <p className="text-sm text-slate-500">{secondaryName}</p>
      <p className="mt-1 text-sm font-medium text-primary">{instructor.title}</p>

      <ul className="mt-3 space-y-2 border-t border-slate-200/70 pt-3">
        <li className="flex items-center gap-2 text-xs text-slate-600">
          <GraduationCap aria-hidden="true" className="size-3.5 shrink-0 text-slate-400" />
          {instructor.qualification}
        </li>
        <li className="flex items-center gap-2 text-xs text-slate-600">
          <BookOpen aria-hidden="true" className="size-3.5 shrink-0 text-slate-400" />
          {instructor.specialty}
        </li>
        <li className="flex items-center gap-2 text-xs text-slate-600">
          <Award aria-hidden="true" className="size-3.5 shrink-0 text-slate-400" />
          {t("experience", { years: instructor.experienceYears })}
        </li>
        <li className="flex items-center gap-2 text-xs text-slate-600">
          <Users aria-hidden="true" className="size-3.5 shrink-0 text-slate-400" />
          {t("studentsTaught", {
            count: instructor.studentsTaught.toLocaleString("en-US"),
          })}
        </li>
      </ul>

      <Button
        variant="outline"
        className="mt-4 w-full border-slate-200 bg-white/80"
        nativeButton={false}
        render={<Link href={instructor.profileHref} />}
      >
        {t("viewProfile")}
        <ChevronRight aria-hidden="true" className="size-4 rtl:rotate-180" />
      </Button>
    </div>
  );
}
