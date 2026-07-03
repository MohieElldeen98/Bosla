import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { quizAttempts } from "@/db/schema/learning";
import type { NewQuizAttemptInput, QuizAttempt } from "@/learning/types/quiz-attempt";

type QuizAttemptRow = typeof quizAttempts.$inferSelect;

function mapRowToQuizAttempt(row: QuizAttemptRow): QuizAttempt {
  return {
    id: row.id,
    quizId: row.quizId,
    studentId: row.studentId,
    scorePercent: row.scorePercent,
    passed: row.passed,
    submittedAt: row.submittedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Data access for `quiz_attempts`. `QuizAttemptService` is the only
 *  caller. No `update`/`delete` — a submitted attempt is an immutable
 *  historical record, same reasoning `cms_page_versions` is append-only
 *  (docs/cms-overview.md §15). Grading (turning a student's answers into
 *  `scorePercent`/`passed`) is out of scope for this step — see
 *  `NewQuizAttemptInput`'s doc comment. */
export const QuizAttemptRepository = {
  async create(input: NewQuizAttemptInput): Promise<QuizAttempt> {
    const [row] = await getDb()
      .insert(quizAttempts)
      .values({
        quizId: input.quizId,
        studentId: input.studentId,
        scorePercent: input.scorePercent,
        passed: input.passed,
        updatedAt: new Date(),
      })
      .returning();
    return mapRowToQuizAttempt(row);
  },

  async findById(id: string): Promise<QuizAttempt | null> {
    const [row] = await getDb().select().from(quizAttempts).where(eq(quizAttempts.id, id)).limit(1);
    return row ? mapRowToQuizAttempt(row) : null;
  },

  /** Newest first — a student's most recent attempt is what a future
   *  Course Player would show by default. */
  async findByStudentAndQuiz(studentId: string, quizId: string): Promise<QuizAttempt[]> {
    const rows = await getDb()
      .select()
      .from(quizAttempts)
      .where(and(eq(quizAttempts.studentId, studentId), eq(quizAttempts.quizId, quizId)))
      .orderBy(desc(quizAttempts.submittedAt));
    return rows.map(mapRowToQuizAttempt);
  },

  async findByStudentId(studentId: string): Promise<QuizAttempt[]> {
    const rows = await getDb()
      .select()
      .from(quizAttempts)
      .where(eq(quizAttempts.studentId, studentId))
      .orderBy(desc(quizAttempts.submittedAt));
    return rows.map(mapRowToQuizAttempt);
  },
};
