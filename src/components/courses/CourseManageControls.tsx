"use client";

import { useEffect, useState } from "react";
import { ListTree, PenLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getCourseManageAccessAction } from "@/courses/actions/course.actions";

/**
 * The course page's author/manager controls — "Edit course" and
 * "Curriculum", linking to the on-site workspace so an author never needs
 * a panel. Shown only to someone who may manage the course, resolved
 * client-side (`getCourseManageAccessAction`) so `/courses/[slug]` stays
 * ISR-cached. Presentation only; the pages and mutations re-check
 * server-side. Mirrors the blog's `EditArticleButton`.
 */
export function CourseManageControls({ courseId, slug }: { courseId: string; slug: string }) {
  const t = useTranslations("CourseCatalog.detail");
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCourseManageAccessAction(courseId).then((allowed) => {
      if (!cancelled) setCanManage(allowed);
    });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (!canManage) return null;

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      <Link
        href={`/courses/${slug}/edit`}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
      >
        <PenLine aria-hidden="true" className="size-3.5" />
        {t("manageCourse")}
      </Link>
      <Link
        href={`/courses/${slug}/curriculum`}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
      >
        <ListTree aria-hidden="true" className="size-3.5" />
        {t("manageCurriculum")}
      </Link>
    </div>
  );
}
