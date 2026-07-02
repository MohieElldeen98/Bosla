"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

interface HeroNavigationProps {
  count: number;
  index: number;
  onGoTo: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  labels: {
    previous: string;
    next: string;
    chooseInstructor: string;
    goTo: (position: number) => string;
  };
}

/**
 * Layer 5 — Hero navigation. Vertical numbered pagination with a thin
 * progress tick per slide on large screens (pinned to the viewport edge, not
 * the content column); a compact horizontal dot row on small screens where
 * there's no room for an edge-pinned control.
 */
export function HeroNavigation({
  count,
  index,
  onGoTo,
  onPrev,
  onNext,
  labels,
}: HeroNavigationProps) {
  if (count <= 1) return null;

  return (
    <>
      <div className="absolute start-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-5 lg:start-8 lg:flex">
        <button
          type="button"
          onClick={onPrev}
          aria-label={labels.previous}
          className="text-slate-400 transition-colors hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ChevronUp aria-hidden="true" className="size-4" />
        </button>

        <div className="flex flex-col items-center gap-3">
          {Array.from({ length: count }).map((_, itemIndex) => (
            <button
              key={itemIndex}
              type="button"
              onClick={() => onGoTo(itemIndex)}
              aria-current={itemIndex === index}
              aria-label={labels.goTo(itemIndex + 1)}
              className="group flex flex-col items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span
                className={`text-xs font-medium tabular-nums transition-colors ${
                  itemIndex === index ? "text-primary" : "text-slate-300 group-hover:text-slate-400"
                }`}
              >
                {String(itemIndex + 1).padStart(2, "0")}
              </span>
              <span
                className={`h-4 w-px transition-colors ${
                  itemIndex === index ? "bg-primary" : "bg-slate-200"
                }`}
              />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onNext}
          aria-label={labels.next}
          className="text-slate-400 transition-colors hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ChevronDown aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div
        role="tablist"
        aria-label={labels.chooseInstructor}
        className="relative z-20 mt-6 flex items-center justify-center gap-1.5 lg:hidden"
      >
        {Array.from({ length: count }).map((_, itemIndex) => (
          <button
            key={itemIndex}
            type="button"
            role="tab"
            onClick={() => onGoTo(itemIndex)}
            aria-selected={itemIndex === index}
            aria-label={labels.goTo(itemIndex + 1)}
            className={`h-2 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              itemIndex === index ? "w-6 bg-primary" : "w-2 bg-slate-200 hover:bg-slate-300"
            }`}
          />
        ))}
      </div>
    </>
  );
}
