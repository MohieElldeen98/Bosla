/**
 * Frozen display-ready curriculum contract, governed by
 * `docs/courses-ux-spec.md` §10.1 and consumed by the details marketing
 * surface, player learning surface, and dashboard summary surface. Changes
 * require a specification amendment.
 */

export type CurriculumTreeMode = "marketing" | "learning" | "summary";

export type CurriculumLessonKind = "video" | "text" | "quiz";

export type CurriculumLessonState = "locked" | "available" | "completed" | "current";

export interface CurriculumLessonNode {
  id: string;
  title: string;
  position: number;
  durationSeconds: number | null;
  kind: CurriculumLessonKind;
  isPreview: boolean;
  state: CurriculumLessonState;
}

export interface CurriculumModuleNode {
  id: string;
  title: string;
  position: number;
  lessons: CurriculumLessonNode[];
  lessonCount: number;
  totalDurationSeconds: number;
}

export interface CurriculumTree {
  modules: CurriculumModuleNode[];
  moduleCount: number;
  lessonCount: number;
  totalDurationSeconds: number;
}
