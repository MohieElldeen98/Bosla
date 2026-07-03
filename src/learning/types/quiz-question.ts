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
 *  strings. Still includes `correctChoiceIndex` — this type is for
 *  admin/content-authoring reads and server-side grading
 *  (`QuizAttemptService.submit`), which both need the real answer. The
 *  Quiz Player's own client-facing type, `PlayerQuizQuestion`
 *  (`learning/types/course-player.ts`), is the one that strips it before
 *  anything reaches the browser. */
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
