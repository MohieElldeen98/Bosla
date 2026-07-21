import type { LucideIcon } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** One analytics stat tile — a labeled hero number with an optional
 *  support line, per the "sometimes the answer is not a chart" rule.
 *  Values wear text tokens; the icon chip is the only colored element. */
export function RevenueStatCard({
  label,
  value,
  support,
  icon: Icon,
}: {
  label: string;
  value: string;
  support?: string;
  icon?: LucideIcon;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardDescription>{label}</CardDescription>
          {Icon && (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon aria-hidden="true" className="size-4" />
            </span>
          )}
        </div>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
        {support && <p className="text-xs text-muted-foreground">{support}</p>}
      </CardHeader>
    </Card>
  );
}
