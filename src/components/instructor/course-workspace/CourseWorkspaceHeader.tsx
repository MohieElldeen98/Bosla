import { CourseWorkspaceNav } from "@/components/instructor/course-workspace/CourseWorkspaceNav";
import { BreadcrumbTrail } from "@/components/layout/breadcrumb-trail";

/**
 * Registers the course's own breadcrumb segment (and, past the Overview
 * tab, the active tab's segment too) and renders the tab bar — the one
 * thing every Course Workspace page (`edit`/`curriculum`/`students`/
 * `coupons`) renders identically, right below its own `PageTitle`.
 * `tabLabel` is omitted on the Overview tab itself (the course title
 * *is* the current page there; a trailing "Overview" crumb would be
 * redundant).
 */
export function CourseWorkspaceHeader({
  courseId,
  courseTitle,
  tabLabel,
}: {
  courseId: string;
  courseTitle: string;
  tabLabel?: string;
}) {
  const segments = [
    { label: courseTitle, href: `/instructor/courses/${courseId}/edit` },
    ...(tabLabel ? [{ label: tabLabel }] : []),
  ];

  return (
    <>
      <BreadcrumbTrail segments={segments} />
      <CourseWorkspaceNav courseId={courseId} />
    </>
  );
}
