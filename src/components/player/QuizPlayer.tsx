"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { submitQuizAttemptAction } from "@/learning/actions/quiz-attempt.actions";
import type { PlayerQuizAttemptResult, PlayerQuizData } from "@/learning/types/course-player";

/**
 * The real Quiz Player (Step 4.5) — single-choice questions, client-side
 * "every question answered" validation before submit, and server-side
 * grading via `submitQuizAttemptAction` (the client never computes or
 * sends a score — see `QuizAttemptService.submit`'s doc comment for why).
 * Two views: the question form, and the result view (score/pass-fail/
 * completion state) shown either after a fresh submission or immediately
 * on revisit if `quiz.latestAttempt` already exists — retakes are
 * allowed (the `quiz_attempts` schema has no unique constraint), but
 * always as an explicit "Retake Quiz" click, never an automatic
 * resubmission of the same click.
 */
export function QuizPlayer({ studentId, quiz }: { studentId: string; quiz: PlayerQuizData }) {
  const t = useTranslations("CoursePlayer.content.quiz");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [validationError, setValidationError] = useState(false);
  const [result, setResult] = useState<PlayerQuizAttemptResult | null>(quiz.latestAttempt);
  const [showForm, setShowForm] = useState(quiz.latestAttempt === null);

  const totalCount = quiz.questions.length;
  const answeredCount = Object.keys(answers).length;

  function handleAnswer(questionId: string, choiceIndex: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: choiceIndex }));
    setValidationError(false);
  }

  function handleRetake() {
    setAnswers({});
    setValidationError(false);
    setShowForm(true);
  }

  function handleSubmit() {
    if (answeredCount < totalCount) {
      setValidationError(true);
      return;
    }
    startTransition(async () => {
      const submitResult = await submitQuizAttemptAction({
        quizId: quiz.id,
        studentId,
        answers: Object.entries(answers).map(([questionId, selectedChoiceIndex]) => ({
          questionId,
          selectedChoiceIndex,
        })),
      });
      if (!submitResult.success) {
        toast.error(submitResult.message);
        return;
      }
      setResult(submitResult.data);
      setShowForm(false);
      toast.success(submitResult.data.passed ? t("toasts.passed") : t("toasts.failed"));
      router.refresh();
    });
  }

  if (!showForm && result) {
    const correctCount = Math.round((result.scorePercent / 100) * totalCount);
    return (
      <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-6 text-center">
        <span
          className={
            result.passed
              ? "mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
              : "mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"
          }
        >
          {result.passed ? (
            <CheckCircle2 aria-hidden="true" className="size-6" />
          ) : (
            <XCircle aria-hidden="true" className="size-6" />
          )}
        </span>
        <div>
          <p className="text-lg font-semibold text-foreground">
            {result.passed ? t("result.passedTitle") : t("result.failedTitle")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("result.score", { score: result.scorePercent, correct: correctCount, total: totalCount })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("result.threshold", { threshold: quiz.passThresholdPercent })}
          </p>
        </div>
        <Badge variant={result.passed ? "default" : "destructive"}>
          {result.passed ? t("result.passedBadge") : t("result.failedBadge")}
        </Badge>
        <div>
          <Button type="button" variant="outline" onClick={handleRetake}>
            {t("retake")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t("instructions")}</p>
      <ol className="space-y-6">
        {quiz.questions.map((question, index) => (
          <li key={question.id} className="space-y-3">
            <p className="text-sm font-medium text-foreground">
              {t("questionLabel", { number: index + 1, total: totalCount })}
              <span className="mt-1 block text-base font-semibold">{question.prompt}</span>
            </p>
            <RadioGroup
              value={answers[question.id] ?? null}
              onValueChange={(value) => handleAnswer(question.id, value as number)}
              disabled={isPending}
            >
              {question.choices.map((choice, choiceIndex) => {
                const inputId = `${question.id}-${choiceIndex}`;
                return (
                  <div key={inputId} className="flex items-center gap-2">
                    <RadioGroupItem id={inputId} value={choiceIndex} />
                    <Label htmlFor={inputId} className="cursor-pointer font-normal">
                      {choice}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </li>
        ))}
      </ol>

      {validationError && (
        <p role="alert" className="text-sm text-destructive">
          {t("validationError")}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{t("answeredCount", { answered: answeredCount, total: totalCount })}</p>
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? t("submitting") : t("submit")}
        </Button>
      </div>
    </div>
  );
}
