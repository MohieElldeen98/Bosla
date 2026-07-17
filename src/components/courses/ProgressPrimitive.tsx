import { cn } from "@/lib/utils";

export function ProgressPrimitive({
  completed,
  total,
  labelStyle = "fraction",
  label,
  compact = false,
}: {
  completed: number;
  total: number;
  labelStyle?: "fraction" | "percent";
  label?: string;
  compact?: boolean;
}) {
  const safeTotal = Math.max(total, 0);
  const safeCompleted = Math.min(Math.max(completed, 0), safeTotal);
  const percentage = safeTotal === 0 ? 0 : Math.round((safeCompleted / safeTotal) * 100);
  const accessibleLabel = label ?? (labelStyle === "percent" ? `${percentage}%` : `${safeCompleted}/${safeTotal}`);

  return (
    <div className="flex w-full items-center gap-2">
      <div
        className={cn("w-full overflow-hidden rounded-full bg-muted", compact ? "h-1" : "h-2")}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-valuenow={safeCompleted}
        aria-label={accessibleLabel}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {!compact && <span className="shrink-0 tabular-nums text-xs text-muted-foreground">{accessibleLabel}</span>}
    </div>
  );
}
