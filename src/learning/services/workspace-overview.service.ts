import { StudentDashboardService } from "@/learning/services/student-dashboard.service";
import { CertificateService } from "@/certificates/services/certificate.service";
import { canAccessStudentData } from "@/learning/utils/require-student-access";
import type { Locale } from "@/i18n/routing";
import type { AuthUser } from "@/auth/types/session";
import type { LearningActionResult } from "@/learning/types/result";
import type { WorkspaceActivityItem, WorkspaceOverviewData } from "@/learning/types/workspace-overview";

const MAX_RECENT_ACTIVITY = 5;

/**
 * Composition for `/me`'s Overview tab — layers a few small, purely
 * derived views (stats, latest certificate, a merged recent-activity
 * timeline) on top of `StudentDashboardService.getDashboard`'s existing
 * `courses`/`continueLearning` read, rather than re-fetching the same
 * enrollment/lesson-progress data a second time. Nothing here is
 * stored: every field is computed fresh per request, same "derived, not
 * stored" reasoning `course-completion-status.ts` already established
 * for progress itself.
 */
export const WorkspaceOverviewService = {
  async getOverview(
    actingUser: AuthUser,
    studentId: string,
    locale: Locale,
  ): Promise<LearningActionResult<WorkspaceOverviewData>> {
    if (!canAccessStudentData(actingUser, studentId)) {
      return { success: false, code: "forbidden", message: "You cannot view this workspace." };
    }

    const dashboardResult = await StudentDashboardService.getDashboard(actingUser, studentId, locale);
    if (!dashboardResult.success) {
      return dashboardResult;
    }
    const { courses, continueLearning } = dashboardResult.data;

    const totalEnrolled = courses.length;
    const completed = courses.filter((course) => course.completionStatus === "completed").length;
    const inProgress = courses.filter((course) => course.completionStatus === "in_progress").length;
    const averageProgress =
      totalEnrolled > 0
        ? Math.round(courses.reduce((sum, course) => sum + course.progressPercentage, 0) / totalEnrolled)
        : 0;

    const certificatesResult = await CertificateService.listForStudent(actingUser, studentId);
    const certificates = certificatesResult.success ? certificatesResult.data : [];
    const latestCertificate =
      certificates.length > 0
        ? [...certificates].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))[0]
        : null;

    const courseTitleById = new Map(courses.map((course) => [course.courseId, course.courseTitle]));

    const activity: WorkspaceActivityItem[] = [];
    for (const course of courses) {
      activity.push({
        kind: "enrolled",
        courseId: course.courseId,
        courseTitle: course.courseTitle,
        occurredAt: course.enrolledAt,
      });
      if (course.lastActivityAt) {
        activity.push({
          kind: "activity",
          courseId: course.courseId,
          courseTitle: course.courseTitle,
          occurredAt: course.lastActivityAt,
        });
      }
    }
    for (const certificate of certificates) {
      const courseTitle = courseTitleById.get(certificate.courseId);
      if (!courseTitle) continue;
      activity.push({
        kind: "certificate",
        courseId: certificate.courseId,
        courseTitle,
        occurredAt: certificate.issuedAt,
      });
    }
    activity.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

    return {
      success: true,
      data: {
        courses,
        continueLearning,
        stats: { totalEnrolled, completed, inProgress, averageProgress },
        latestCertificate,
        recentActivity: activity.slice(0, MAX_RECENT_ACTIVITY),
      },
    };
  },
};
