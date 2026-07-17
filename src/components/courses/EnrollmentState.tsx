"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { ProgressPrimitive } from "@/components/courses/ProgressPrimitive";
import { getPublicEnrollmentStateAction } from "@/learning/actions/public-enrollment.actions";
import { cn } from "@/lib/utils";

export function EnrollmentState({ courseId, slug, isFree }: { courseId: string; slug: string; isFree: boolean }) {
  const t = useTranslations("CourseCatalog.detail");
  const [state, setState] = useState<{ enrolled: boolean; completed: number; total: number } | null>(null);
  useEffect(() => {
    void getPublicEnrollmentStateAction(courseId).then(setState);
  }, [courseId]);
  if (!state) return <div className="mt-4 h-11 animate-pulse rounded-md bg-muted" aria-label={t("loadingEnrollment")} />;
  if (state.enrolled) {
    return (
      <div className="space-y-3">
        <ProgressPrimitive completed={state.completed} total={state.total} label={t("lessonProgress", { completed: state.completed, total: state.total })} />
        <Link href={`/courses/${slug}/learn`} className={cn(buttonVariants(), "w-full")}>{t("continueLearning")}</Link>
      </div>
    );
  }
  // Free and paid both route through checkout — it already owns the
  // sign-in redirect and the zero-total enrollment path, so the details
  // page never needs its own enroll mutation.
  return (
    <Link href={`/checkout/${slug}`} className={cn(buttonVariants(), "mt-4 w-full")}>
      {isFree ? t("enrollFree") : t("buyNow")}
    </Link>
  );
}
