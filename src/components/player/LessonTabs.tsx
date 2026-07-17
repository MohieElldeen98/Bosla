"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The below-video tab row — receives its panels as already-rendered
 * server nodes (same translator-boundary reasoning as
 * `DashboardCoursesFilter`) and only mounts tabs that actually have
 * content; the caller skips rendering this entirely when none do.
 */
export function LessonTabs({
  tabs,
}: {
  tabs: { id: string; label: string; node: React.ReactNode }[];
}) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  return (
    <div>
      <div role="tablist" className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === active?.id}
            onClick={() => setActiveId(tab.id)}
            className={cn(
              "-mb-px border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tab.id === active?.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="pt-5">
        {active?.node}
      </div>
    </div>
  );
}
