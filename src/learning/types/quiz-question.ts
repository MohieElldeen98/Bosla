import type { LocalizedText } from "@/types/i18n";

/** Mirrors `db/schema/learning.ts`'s `quiz_questions` table. `choices` is
 *  a JSON array of `LocalizedText`, not a separate table — see that
 *  schema's doc comment for why. */
export interface QuizQuestion {
  id: string;
  quizId: string;
  prompt: LocalizedText;
  position: number;
  choices: LocalizedText[];
  correctChoiceIndex: number;
  createdAt: string;
  updatedAt: string;
}

/** The locale-resolved view — bilingual fields flattened to plain
 *  strings. Still includes `correctChoiceIndex`: grading/answer-hiding
 *  for an actual quiz-taking UI is a later step's concern (Course
 *  Player), not this backend-only one. */
export interface ResolvedQuizQuestion {
  id: string;
  quizId: string;
  prompt: string;
  position: number;
  choices: string[];
  correctChoiceIndex: number;
}

export interface NewQuizQuestionInput {
  quizId: string;
  prompt: LocalizedText;
  position?: number;
  choices: LocalizedText[];
  correctChoiceIndex: number;
}
