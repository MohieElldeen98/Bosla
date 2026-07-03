import { QuizAttemptRepository } from "@/learning/repositories/quiz-attempt.repository";
import { QuizRepository } from "@/learning/repositories/quiz.repository";
import { QuizQuestionService } from "@/learning/services/quiz-question.service";
import { EnrollmentService } from "@/learning/services/enrollment.service";
import { LessonProgressService } from "@/learning/services/lesson-progress.service";
import { canAccessStudentData } from "@/learning/utils/require-student-access";
import { resolveLessonCourse } from "@/learning/utils/resolve-lesson-course";
import { gradeQuizAttempt } from "@/learning/utils/grade-quiz";
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

  /**
   * The Quiz Player's (Step 4.5) submit action. Grades server-side —
   * `input.answers` is the only thing trusted from the client; the
   * correct answers themselves are fetched fresh from `quiz_questions`
   * here and never touch the client. Also re-verifies the student is
   * *actively enrolled* in the quiz's course before accepting a
   * submission — the Course Player's own read path already keeps an
   * unenrolled student from ever seeing the quiz, but a direct POST to
   * this action must independently enforce the same rule, not just rely
   * on the UI never offering the option ("Direct URL/request access must
   * still enforce authorization," the same principle
   * `CoursePlayerService` follows for reads).
   *
   * On a passing attempt, marks the quiz's lesson complete via the
   * existing `LessonProgressService.setCompleted` — course progress is
   * derived from `lesson_progress`, not stored, so nothing else needs to
   * "update" for the Dashboard/Course Player to reflect it. A failing
   * attempt is still recorded (so score history exists) but does not
   * complete the lesson, allowing the student to retake it — retakes are
   * allowed by the `quiz_attempts` schema's own design (no unique
   * `(quiz, student)` constraint); this method does not add one.
   */
  async submit(
    actingUser: AuthUser,
    input: SubmitQuizAttemptInput,
  ): Promise<LearningActionResult<QuizAttempt>> {
    if (!canAccessStudentData(actingUser, input.studentId)) {
      return { success: false, code: "forbidden", message: "You cannot submit an attempt for this student." };
    }

    return safeMutation(async () => {
      const quiz = await QuizRepository.findById(input.quizId);
      if (!quiz) {
        return { success: false, code: "not_found", message: "Quiz not found." };
      }

      const owner = await resolveLessonCourse(quiz.lessonId);
      if (!owner) {
        return { success: false, code: "not_found", message: "Quiz not found." };
      }

      const enrolled = await EnrollmentService.isEnrolled(input.studentId, owner.courseId);
      if (!enrolled) {
        return { success: false, code: "forbidden", message: "You are not enrolled in this course." };
      }

      const questions = await QuizQuestionService.listByQuizId(input.quizId);
      if (questions.length === 0) {
        return { success: false, code: "validation_failed", message: "This quiz has no questions yet." };
      }

      const grade = gradeQuizAttempt(questions, input.answers, quiz.passThresholdPercent);

      const created = await QuizAttemptRepository.create({
        quizId: input.quizId,
        studentId: input.studentId,
        scorePercent: grade.scorePercent,
        passed: grade.passed,
      });

      if (grade.passed) {
        await LessonProgressService.setCompleted(actingUser, {
          studentId: input.studentId,
          lessonId: quiz.lessonId,
          completed: true,
        });
      }

      return { success: true, data: created };
    });
  },
};
