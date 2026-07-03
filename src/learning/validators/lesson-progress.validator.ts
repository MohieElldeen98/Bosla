import { z } from "zod";

export const setLessonProgressSchema = z.object({
  studentId: z.string().uuid(),
  lessonId: z.string().uuid(),
  completed: z.boolean(),
});
export type SetLessonProgressInput = z.infer<typeof setLessonProgressSchema>;
