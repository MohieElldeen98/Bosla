/**
 * The Admin User Management module's (Phase 7) own result type — same
 * `{success:true,data}|{success:false,code,message}` shape every other
 * domain keeps its own copy of, since this composition service
 * (`UserAdminService`) sits in the Auth domain but reads across
 * Course/Learning/CMS.
 */
export type UserAdminErrorCode = "forbidden" | "unknown";

export type UserAdminActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; code: UserAdminErrorCode; message: string };

/** One entry in the User Details page's Activity tab — a merged, sorted
 *  view across the three existing per-domain audit tables
 *  (`course_audit_logs`, `learning_audit_logs`, `cms_audit_logs`),
 *  filtered to `actorId = this user`. Deliberately thin: `action` is the
 *  raw action string (translated in the UI via `Admin.users.activity.
 *  actions.<domain>.<action>`), `courseTitle` is resolved only where
 *  it's cheap and meaningful (Course/Learning domains have a direct
 *  `courseId`; CMS entries don't reference a course, so it's `null`
 *  there). */
export interface ActivityFeedEntry {
  id: string;
  domain: "course" | "learning" | "cms";
  action: string;
  courseTitle: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

/** One row in the User Details page's Quiz Attempts tab — a `QuizAttempt`
 *  with its course/lesson resolved, composed the same "parallel
 *  repository reads, no cross-domain SQL join" way every other resolved
 *  view in this codebase is. */
export interface QuizAttemptSummaryItem {
  id: string;
  courseTitle: string;
  lessonTitle: string;
  scorePercent: number;
  passed: boolean;
  submittedAt: string;
}
