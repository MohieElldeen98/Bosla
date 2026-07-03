"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2, Circle } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { setLessonProgressAction } from "@/learning/actions/lesson-progress.actions";

/**
 * "Mark as Complete" toggle — reuses the existing `setLessonProgressAction`
 * (Step 4.1) as-is, no new Server Action needed. Optimistic, same pattern
 * as `SectionEnableToggle`: flips immediately, reverts (and toasts) on
 * failure. `router.refresh()` on success re-renders the Server Component
 * tree above it (the sidebar's checkmark + course progress bar both derive
 * from this same `lesson_progress` row), so they never fall out of sync
 * with this button's own state.
 */
export function LessonCompletionToggle({
  studentId,
  lessonId,
  initialCompleted,
}: {
  studentId: string;
  lessonId: string;
  initialCompleted: boolean;
}) {
  const t = useTranslations("CoursePlayer");
  const router = useRouter();
  const [completed, setCompleted] = useState(initialCompleted);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const next = !completed;
    setCompleted(next);
    startTransition(async () => {
      try {
        const result = await setLessonProgressAction({ studentId, lessonId, completed: next });
        if (!result.success) {
          setCompleted(!next);
          toast.error(result.message);
          return;
        }
        toast.success(next ? t("toasts.markedComplete") : t("toasts.markedIncomplete"));
        router.refresh();
      } catch {
        setCompleted(!next);
        toast.error(t("toasts.networkError"));
      }
    });
  }

  return (
    <Button type="button" variant={completed ? "secondary" : "default"} disabled={isPending} onClick={handleClick}>
      {completed ? (
        <CheckCircle2 aria-hidden="true" className="text-emerald-600" />
      ) : (
        <Circle aria-hidden="true" />
      )}
      {completed ? t("content.completed") : t("content.markComplete")}
    </Button>
  );
}
