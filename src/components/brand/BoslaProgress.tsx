import { cn } from "@/lib/utils";

/**
 * The brand progress indicator — the needle's arrowhead traveling along
 * a track instead of a generic spinner/bar. Pass `value` (0–100) for a
 * determinate bar; omit it for the indeterminate glide (buffering).
 * The arrowhead flips automatically in RTL (`rtl:-scale-x-100` on the
 * head, and the track fills from the start edge either way).
 */
export function BoslaProgress({
  value,
  className,
  label,
}: {
  value?: number;
  className?: string;
  label?: string;
}) {
  const clamped = value === undefined ? undefined : Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn("bosla-progress", clamped === undefined && "bosla-progress-indeterminate", className)}
    >
      <div className="bosla-progress-track" />
      <div
        className="bosla-progress-fill"
        style={clamped !== undefined ? { width: `${clamped}%` } : undefined}
      />
      <div
        className="bosla-progress-head"
        style={clamped !== undefined ? { insetInlineStart: `${clamped}%` } : undefined}
      >
        <svg viewBox="0 0 24 24" className="size-full rtl:-scale-x-100">
          <path d="M4 5 L20 12 L4 19 Q8 12 4 5 Z" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}
