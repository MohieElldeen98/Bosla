import { getTranslations } from "next-intl/server";
import { BookOpen, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { WorkspaceLearningStats } from "@/learning/types/workspace-overview";

/** The Overview tab's "small learning statistics" — four numbers, no
 *  charts, no widgets beyond what the spec asked for. */
export async function WorkspaceStatsRow({ stats }: { stats: WorkspaceLearningStats }) {
  const t = await getTranslations("Me.overview.stats");

  const items = [
    { icon: BookOpen, label: t("enrolled"), value: stats.totalEnrolled },
    { icon: Clock, label: t("inProgress"), value: stats.inProgress },
    { icon: CheckCircle2, label: t("completed"), value: stats.completed },
    { icon: TrendingUp, label: t("averageProgress"), value: `${stats.averageProgress}%` },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="flex flex-col gap-2 p-4">
          <item.icon aria-hidden="true" className="size-4 text-muted-foreground" />
          <p className="text-xl font-semibold text-foreground">{item.value}</p>
          <p className="text-xs text-muted-foreground">{item.label}</p>
        </Card>
      ))}
    </div>
  );
}
