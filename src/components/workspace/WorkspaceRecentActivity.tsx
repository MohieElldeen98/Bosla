import { getTranslations } from "next-intl/server";
import { Award, GraduationCap, PlayCircle } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import type { WorkspaceActivityItem } from "@/learning/types/workspace-overview";

const ICON_BY_KIND = { enrolled: GraduationCap, activity: PlayCircle, certificate: Award } as const;

/** The Overview tab's small merged timeline — `enrolled`/`activity`/
 *  `certificate` events, already sorted and capped to 5 by
 *  `WorkspaceOverviewService`; this component just renders them. */
export async function WorkspaceRecentActivity({
  items,
  locale,
}: {
  items: WorkspaceActivityItem[];
  locale: string;
}) {
  const t = await getTranslations("Me.overview.activity");

  if (items.length === 0) {
    return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  return (
    <ul className="space-y-1">
      {items.map((item, index) => {
        const Icon = ICON_BY_KIND[item.kind];
        return (
          <li
            key={`${item.kind}-${item.courseId}-${index}`}
            className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-foreground">{t(`kinds.${item.kind}`, { course: item.courseTitle })}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(item.occurredAt).toLocaleDateString(locale, { month: "short", day: "numeric" })}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
