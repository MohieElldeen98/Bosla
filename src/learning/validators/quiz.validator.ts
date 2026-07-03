import { z } from "zod";

const quizBaseFields = z.object({
  lessonId: z.string().uuid(),
  passThresholdPercent: z.number().int().min(0).max(100),
});

export const createQuizSchema = quizBaseFields.extend({
  passThresholdPercent: z.number().int().min(0).max(100).default(70),
});
export type CreateQuizInput = z.infer<typeof createQuizSchema>;

export const updateQuizSchema = quizBaseFields.omit({ lessonId: true }).partial();
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;
