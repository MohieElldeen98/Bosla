/** The Instructor Earnings page's (`/instructor/earnings`, Phase 6,
 *  Step 6.6) own read-model — gross revenue collected so far per one of
 *  the signed-in Instructor's own courses, `paid` orders only. No
 *  payout/revenue-share figure — that math doesn't exist anywhere in
 *  this codebase yet (deliberately deferred, see
 *  docs/future-features.md's "Automated instructor payouts" entry) —
 *  this is a read-only display of what's actually been collected, per
 *  docs/roles-and-permissions.md §5's "read-only display until payout
 *  automation exists." */
export interface InstructorCourseEarnings {
  courseId: string;
  courseTitle: string;
  currency: string;
  totalRevenue: string;
  paidOrderCount: number;
}

export interface InstructorEarningsSummary {
  courses: InstructorCourseEarnings[];
  totalRevenue: string;
  totalPaidOrders: number;
}
