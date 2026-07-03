import type { Lesson } from "@/learning/types/lesson";
import type { Module } from "@/learning/types/module";

/**
 * The Curriculum Builder's (Phase 6, Step 6.4) nested tree shape — a
 * `Module` plus its own `Lesson[]`, both ordered by `position`.
 * Deliberately the *raw*, bilingual `Module`/`Lesson` shape, not
 * `ResolvedModule`/`ResolvedLesson` — the Curriculum Builder is an
 * editing surface (create/edit needs every locale's value, the same
 * reasoning `/instructor/courses/[id]/edit` reads a raw `Course`, not a
 * `ResolvedCourse`), and the tree view itself resolves a single
 * locale's string client-side for display, from the same raw data the
 * edit forms need anyway — one fetch, no separate "resolved for display"
 * vs. "raw for editing" round trip.
 */
export interface CurriculumModule extends Module {
  lessons: Lesson[];
}
