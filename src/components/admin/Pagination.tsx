"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Presentation-only — the caller owns how a page change is actually
 * applied (URL search params for `/admin/courses`, or local state for a
 * future admin listing that doesn't need shareable URLs). Reusable as-is
 * for any future paginated admin list (Instructors, Categories, Users —
 * Phase 7).
 */
export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  summary,
  previousLabel,
  nextLabel,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  summary: (range: { from: number; to: number; total: number }) => string;
  previousLabel: string;
  nextLabel: string;
}) {
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row">
      <p className="text-sm text-muted-foreground">{summary({ from, to, total })}</p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft aria-hidden="true" className="rtl:rotate-180" />
          {previousLabel}
        </Button>
        <span className="min-w-14 text-center text-sm text-muted-foreground">
          {page} / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          {nextLabel}
          <ChevronRight aria-hidden="true" className="rtl:rotate-180" />
        </Button>
      </div>
    </div>
  );
}
