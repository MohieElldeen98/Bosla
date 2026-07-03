import type { QuizQuestion } from "@/learning/types/quiz-question";

export interface QuizAnswerInput {
  questionId: string;
  selectedChoiceIndex: number;
}

export interface QuizGradeResult {
  scorePercent: number;
  passed: boolean;
  correctCount: number;
  totalCount: number;
}

/**
 * The grading step `NewQuizAttemptInput`'s own doc comment (Step 4.1)
 * deferred to "a later step" — this is that step. Pure function, no I/O:
 * takes the *real* `QuizQuestion` rows (with `correctChoiceIndex`, never
 * sent to the client — see `PlayerQuizQuestion`) and the student's
 * submitted answers, and returns the score. An unanswered or
 * out-of-range question is simply not a match, never a thrown error —
 * a student who skips a question just gets it wrong, same as answering
 * incorrectly.
 */
export function gradeQuizAttempt(
  questions: QuizQuestion[],
  answers: QuizAnswerInput[],
  passThresholdPercent: number,
): QuizGradeResult {
  const selectedByQuestionId = new Map(answers.map((answer) => [answer.questionId, answer.selectedChoiceIndex]));
  const totalCount = questions.length;
  const correctCount = questions.filter(
    (question) => selectedByQuestionId.get(question.id) === question.correctChoiceIndex,
  ).length;
  const scorePercent = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const passed = scorePercent >= passThresholdPercent;

  return { scorePercent, passed, correctCount, totalCount };
}
