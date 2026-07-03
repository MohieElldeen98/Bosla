import { z } from "zod";
import { localizedTextSchema } from "@/cms/validators/content-blocks.validator";

const localizedTextArraySchema = z.array(localizedTextSchema);

/** Mirrors the `quiz_questions_correct_choice_in_range_check` DB
 *  constraint client-side, so an out-of-range answer index is rejected
 *  with a field-level Zod error instead of a raw Postgres
 *  constraint-violation message. */
function hasValidCorrectChoiceIndex(data: {
  choices?: { en: string; ar: string }[];
  correctChoiceIndex?: number;
}): boolean {
  if (data.choices === undefined || data.correctChoiceIndex === undefined) return true;
  return data.correctChoiceIndex < data.choices.length;
}

const correctChoiceRefinement: [typeof hasValidCorrectChoiceIndex, { message: string; path: string[] }] = [
  hasValidCorrectChoiceIndex,
  { message: "correctChoiceIndex must be a valid index into choices", path: ["correctChoiceIndex"] },
];

const quizQuestionBaseFields = z.object({
  quizId: z.string().uuid(),
  prompt: localizedTextSchema,
  position: z.number().int().min(0),
  choices: localizedTextArraySchema.min(2, "A question needs at least two choices."),
  correctChoiceIndex: z.number().int().min(0),
});

export const createQuizQuestionSchema = quizQuestionBaseFields
  .extend({ position: z.number().int().min(0).default(0) })
  .refine(...correctChoiceRefinement);
export type CreateQuizQuestionInput = z.infer<typeof createQuizQuestionSchema>;

export const updateQuizQuestionSchema = quizQuestionBaseFields
  .omit({ quizId: true })
  .partial()
  .refine(...correctChoiceRefinement);
export type UpdateQuizQuestionInput = z.infer<typeof updateQuizQuestionSchema>;

export const reorderQuizQuestionsSchema = z.object({
  quizId: z.string().uuid(),
  questionIds: z.array(z.string().uuid()).min(1),
});
export type ReorderQuizQuestionsInput = z.infer<typeof reorderQuizQuestionsSchema>;
