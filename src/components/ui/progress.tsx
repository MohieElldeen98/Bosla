"use client"

import { Progress as ProgressPrimitive } from "@base-ui/react/progress"

import { cn } from "@/lib/utils"

/** `Progress.Indicator`'s width is computed automatically from `value`/
 *  `min`/`max` on `Progress.Root` (base-ui sets it as an inline `%`
 *  style) — this wrapper only styles the track/indicator, same
 *  Root+Track+Indicator composition every base-ui-backed primitive here
 *  uses. First consumer: the Student Dashboard's course progress bars
 *  (Step 4.3). */
function Progress({
  className,
  value,
  ...props
}: ProgressPrimitive.Root.Props) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      className={cn("w-full", className)}
      {...props}
    >
      <ProgressPrimitive.Track
        data-slot="progress-track"
        className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}

export { Progress }
