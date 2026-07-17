"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { CourseCompletionStatus } from "@/learning/types/course-completion-status";

type FilterValue = "all" | "in_progress" | "completed";

/**
 * Client-side status chips over server-rendered cards. The cards arrive
 * as already-rendered nodes (they're Server Components taking awaited
 * translators, which can't cross the client boundary), so filtering here
 * is just choosing which nodes to show — one student's enrollments are
 * never numerous enough to justify a server round-trip per chip.
 */
export function DashboardCoursesFilter({
  items,
  labels,
}: {
  items: { key: string; status: CourseCompletionStatus; node: React.ReactNode }[];
  labels: { all: string; inProgress: string; completed: string; emptyFilter: string };
}) {
  const [filter, setFilter] = useState<FilterValue>("all");

  const chips: { value: FilterValue; label: string }[] = [
    { value: "all", label: labels.all },
    { value: "in_progress", label: labels.inProgress },
    { value: "completed", label: labels.completed },
  ];

  const visible = items.filter((item) => {
    if (filter === "all") return true;
    if (filter === "in_progress") return item.status === "in_progress" || item.status === "not_started";
    return item.status === "completed";
  });

  return (
    <div>
      <div role="group" className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip.value}
            type="button"
            aria-pressed={filter === chip.value}
            onClick={() => setFilter(chip.value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              filter === chip.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
          {labels.emptyFilter}
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <div key={item.key}>{item.node}</div>
          ))}
        </div>
      )}
    </div>
  );
}
