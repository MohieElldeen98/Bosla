import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { timestampMatches } from "@/db/optimistic-concurrency";
import { quizQuestions } from "@/db/schema/learning";
import type { LocalizedText } from "@/types/i18n";
import type { NewQuizQuestionInput, QuizQuestion } from "@/learning/types/quiz-question";
import type { OptimisticUpdateResult } from "@/learning/types/repository-result";

type QuizQuestionRow = typeof quizQuestions.$inferSelect;

export interface UpdateQuizQuestionRow {
  prompt?: LocalizedText;
  position?: number;
  choices?: LocalizedText[];
  correctChoiceIndex?: number;
}

function mapRowToQuizQuestion(row: QuizQuestionRow): QuizQuestion {
  return {
    id: row.id,
    quizId: row.quizId,
    prompt: row.prompt as LocalizedText,
    position: row.position,
    choices: row.choices as LocalizedText[],
    correctChoiceIndex: row.correctChoiceIndex,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Data access for `quiz_questions`. `QuizQuestionService` is the only
 *  caller. The `correct_choice_index < jsonb_array_length(choices)`
 *  check constraint (`db/schema/learning.ts`) means a bad index/choices
 *  pairing fails at the DB, surfacing as a generic Postgres error through
 *  `safeMutation` — the Zod validator independently checks the same rule
 *  client-side first for a real field-level error message. */
export const QuizQuestionRepository = {
  async create(input: NewQuizQuestionInput): Promise<QuizQuestion> {
    const [row] = await getDb()
      .insert(quizQuestions)
      .values({
        quizId: input.quizId,
        prompt: input.prompt,
        position: input.position ?? 0,
        choices: input.choices,
        correctChoiceIndex: input.correctChoiceIndex,
        updatedAt: new Date(),
      })
      .returning();
    return mapRowToQuizQuestion(row);
  },

  async findById(id: string): Promise<QuizQuestion | null> {
    const [row] = await getDb().select().from(quizQuestions).where(eq(quizQuestions.id, id)).limit(1);
    return row ? mapRowToQuizQuestion(row) : null;
  },

  async findByQuizId(quizId: string): Promise<QuizQuestion[]> {
    const rows = await getDb()
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .orderBy(asc(quizQuestions.position));
    return rows.map(mapRowToQuizQuestion);
  },

  async update(
    id: string,
    input: UpdateQuizQuestionRow,
    expectedUpdatedAt?: string,
  ): Promise<OptimisticUpdateResult<QuizQuestion>> {
    const conditions = [eq(quizQuestions.id, id)];
    if (expectedUpdatedAt) conditions.push(timestampMatches(quizQuestions.updatedAt, expectedUpdatedAt));

    const [row] = await getDb()
      .update(quizQuestions)
      .set({ ...input, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();

    if (row) return { status: "ok", data: mapRowToQuizQuestion(row) };
    if (!expectedUpdatedAt) return { status: "not_found" };

    const stillExists = await QuizQuestionRepository.findById(id);
    return stillExists ? { status: "conflict" } : { status: "not_found" };
  },

  async delete(id: string): Promise<void> {
    await getDb().delete(quizQuestions).where(eq(quizQuestions.id, id));
  },
};
