import { getTranslations } from "next-intl/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/admin/EmptyState";
import type { QuizAttemptSummaryItem } from "@/auth/types/user-admin";

/** The User Details page's (Phase 7) Quiz Attempts tab — reuses the
 *  existing Quiz Attempt domain (`QuizAttemptService.listForStudent`,
 *  Step 4.1) via `UserAdminService.getQuizAttemptsSummary`; no mock
 *  attempts, no fabricated scores — an empty list means the student
 *  genuinely hasn't attempted a quiz yet (true for every student today,
 *  since no Curriculum Editor exists to author real quizzes). */
export async function QuizAttemptsTab({ attempts, locale }: { attempts: QuizAttemptSummaryItem[]; locale: string }) {
  const t = await getTranslations("Admin.users.quizAttempts");

  if (attempts.length === 0) {
    return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  return (
    <div className="rounded-2xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columns.course")}</TableHead>
            <TableHead>{t("columns.lesson")}</TableHead>
            <TableHead>{t("columns.score")}</TableHead>
            <TableHead>{t("columns.result")}</TableHead>
            <TableHead>{t("columns.submittedAt")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attempts.map((attempt) => (
            <TableRow key={attempt.id}>
              <TableCell className="font-medium text-foreground">{attempt.courseTitle}</TableCell>
              <TableCell className="text-muted-foreground">{attempt.lessonTitle}</TableCell>
              <TableCell className="text-muted-foreground">{attempt.scorePercent}%</TableCell>
              <TableCell>
                <Badge variant={attempt.passed ? "default" : "destructive"}>
                  {attempt.passed ? t("passed") : t("failed")}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
                  new Date(attempt.submittedAt),
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
