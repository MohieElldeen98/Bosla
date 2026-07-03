import { QuizAttemptRepository } from "@/learning/repositories/quiz-attempt.repository";
import { canAccessStudentData } from "@/learning/utils/require-student-access";
import { safeMutation, safeRead } from "@/learning/utils/safe-operation";
import type { AuthUser } from "@/auth/types/session";
import type { QuizAttempt } from "@/learning/types/quiz-attempt";
import type { LearningActionResult } from "@/learning/types/result";
import type { SubmitQuizAttemptInput } from "@/learning/validators/quiz-attempt.validator";

/**
 * Orchestration for `quiz_attempts` — student-owned data, same
 * `actingUser`/`canAccessStudentData` convention as
 * `LessonProgressService`/`EnrollmentService`'s student-facing half. Not
 * audit-logged, same reasoning as `lesson_progress` (routine self-service
 * activity, not an admin action).
 */
export const QuizAttemptService = {
  async listForStudentAndQuiz(
    actingUser: AuthUser,
    studentId: string,
    quizId: string,
  ): Promise<LearningActionResult<QuizAttempt[]>> {
    if (!canAccessStudentData(actingUser, studentId)) {
      return { success: false, code: "forbidden", message: "You cannot view this student's attempts." };
    }
    const list = await safeRead(() => QuizAttemptRepository.findByStudentAndQuiz(studentId, quizId), []);
    return { success: true, data: list };
  },

  async listForStudent(
    actingUser: AuthUser,
    studentId: string,
  ): Promise<LearningActionResult<QuizAttempt[]>> {
    if (!canAccessStudentData(actingUser, studentId)) {
      return { success: false, code: "forbidden", message: "You cannot view this student's attempts." };
    }
    const list = await safeRead(() => QuizAttemptRepository.findByStudentId(studentId), []);
    return { success: true, data: list };
  },

  async submit(
    actingUser: AuthUser,
    input: SubmitQuizAttemptInput,
  ): Promise<LearningActionResult<QuizAttempt>> {
    if (!canAccessStudentData(actingUser, input.studentId)) {
      return { success: false, code: "forbidden", message: "You cannot submit an attempt for this student." };
    }
    return safeMutation(async () => {
      const created = await QuizAttemptRepository.create(input);
      return { success: true, data: created };
    });
  },
};
