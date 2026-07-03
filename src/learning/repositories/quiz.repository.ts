import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { quizzes } from "@/db/schema/learning";
import type { NewQuizInput, Quiz } from "@/learning/types/quiz";
import type { OptimisticUpdateResult } from "@/learning/types/repository-result";

type QuizRow = typeof quizzes.$inferSelect;

export interface UpdateQuizRow {
  passThresholdPercent?: number;
}

function mapRowToQuiz(row: QuizRow): Quiz {
  return {
    id: row.id,
    lessonId: row.lessonId,
    passThresholdPercent: row.passThresholdPercent,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Data access for `quizzes`. `QuizService` is the only caller. */
export const QuizRepository = {
  async create(input: NewQuizInput): Promise<Quiz> {
    const [row] = await getDb()
      .insert(quizzes)
      .values({
        lessonId: input.lessonId,
        passThresholdPercent: input.passThresholdPercent ?? 70,
        updatedAt: new Date(),
      })
      .returning();
    return mapRowToQuiz(row);
  },

  async findById(id: string): Promise<Quiz | null> {
    const [row] = await getDb().select().from(quizzes).where(eq(quizzes.id, id)).limit(1);
    return row ? mapRowToQuiz(row) : null;
  },

  /** One-to-one with `lessons` — at most one row per `lessonId`. */
  async findByLessonId(lessonId: string): Promise<Quiz | null> {
    const [row] = await getDb().select().from(quizzes).where(eq(quizzes.lessonId, lessonId)).limit(1);
    return row ? mapRowToQuiz(row) : null;
  },

  async update(
    id: string,
    input: UpdateQuizRow,
    expectedUpdatedAt?: string,
  ): Promise<OptimisticUpdateResult<Quiz>> {
    const conditions = [eq(quizzes.id, id)];
    if (expectedUpdatedAt) conditions.push(eq(quizzes.updatedAt, new Date(expectedUpdatedAt)));

    const [row] = await getDb()
      .update(quizzes)
      .set({ ...input, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();

    if (row) return { status: "ok", data: mapRowToQuiz(row) };
    if (!expectedUpdatedAt) return { status: "not_found" };

    const stillExists = await QuizRepository.findById(id);
    return stillExists ? { status: "conflict" } : { status: "not_found" };
  },

  async delete(id: string): Promise<void> {
    await getDb().delete(quizzes).where(eq(quizzes.id, id));
  },
};
