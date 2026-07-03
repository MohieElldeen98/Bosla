import type { LocalizedText } from "@/types/i18n";

/** Mirrors `db/schema/instructor.ts`'s `instructor_application_status`
 *  Postgres enum exactly. */
export const INSTRUCTOR_APPLICATION_STATUSES = ["pending", "approved", "rejected"] as const;
export type InstructorApplicationStatus = (typeof INSTRUCTOR_APPLICATION_STATUSES)[number];

/** Mirrors `db/schema/instructor.ts`'s `instructor_profiles` table — a
 *  student's application to become an Instructor, and (once approved)
 *  the record of that approval. `userId` is `auth.users.id`, not
 *  `profiles.id` — see that table's doc comment. */
export interface InstructorProfile {
  id: string;
  userId: string;
  headline: LocalizedText;
  credentials: string | null;
  status: InstructorApplicationStatus;
  approvedAt: string | null;
  approvedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewInstructorProfileInput {
  userId: string;
  headline: LocalizedText;
  credentials?: string | null;
}

/** The Student Dashboard's/Admin listing's locale-resolved view —
 *  bilingual `headline` flattened to one string, same convention as
 *  `courses/types/instructor.ts`'s `ResolvedInstructor`. */
export interface ResolvedInstructorProfile {
  id: string;
  userId: string;
  headline: string;
  credentials: string | null;
  status: InstructorApplicationStatus;
  approvedAt: string | null;
  approvedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}
