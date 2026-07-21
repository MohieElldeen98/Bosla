import type { DashboardCourseItem } from "@/learning/types/student-dashboard";
import type { Certificate } from "@/certificates/types/certificate";

export interface WorkspaceLearningStats {
  totalEnrolled: number;
  completed: number;
  inProgress: number;
  /** Average `progressPercentage` across every enrolled course, 0 if
   *  there are none — the Overview tab's one summary number. */
  averageProgress: number;
}

/** One entry in the Overview tab's small "Recent Activity" timeline —
 *  merged from a few existing, already-derived timestamps (course
 *  enrollment, last lesson activity, certificate issuance), not a
 *  stored feed of its own. */
export interface WorkspaceActivityItem {
  kind: "enrolled" | "activity" | "certificate";
  courseId: string;
  courseTitle: string;
  occurredAt: string;
}

export interface WorkspaceOverviewData {
  courses: DashboardCourseItem[];
  continueLearning: DashboardCourseItem[];
  stats: WorkspaceLearningStats;
  latestCertificate: Certificate | null;
  recentActivity: WorkspaceActivityItem[];
}
