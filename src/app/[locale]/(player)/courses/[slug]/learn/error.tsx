"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/admin/ErrorState";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

/** Next.js route-segment error boundary for both `/learn` (resume
 *  redirect) and `/learn/[lessonId]` (the player) — defensive coverage
 *  for anything that escapes `CoursePlayerService`/`LessonProgressService`'s
 *  own `safeRead`/`safeMutation` resilience, same reasoning as the
 *  Dashboard's own `error.tsx` (Step 4.3). */
export default function CourseLearnError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("CoursePlayer.error");

  useEffect(() => {
    logger.error("[course-player]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 lg:px-8">
      <ErrorState
        title={t("title")}
        description={t("description")}
        action={
          <Button type="button" onClick={reset}>
            {t("retry")}
          </Button>
        }
      />
    </div>
  );
}
