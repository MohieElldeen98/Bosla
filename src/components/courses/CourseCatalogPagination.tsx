import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The public catalog's pagination (`/courses`, Step 3.4) — plain `<Link>`s
 * to `?page=N` rather than a client `onClick` handler like
 * `@/components/admin/Pagination`: a Server Component (this page's own
 * `page.tsx`) can't hand a client-side callback down, and real links are
 * strictly better here anyway — crawlable, work without JS, and Next
 * still does a client-side transition through them via `<Link>`.
 * `queryString` is the current filters serialized once by the caller
 * (everything except `page`), so this only has to know how to swap that
 * one param.
 */
export function CourseCatalogPagination({
  page,
  totalPages,
  total,
  pageSize,
  queryString,
  summaryLabel,
  previousLabel,
  nextLabel,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  queryString: string;
  summaryLabel: (range: { from: number; to: number; total: number }) => string;
  previousLabel: string;
  nextLabel: string;
}) {
  if (total === 0 || totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  function hrefForPage(targetPage: number): string {
    const params = new URLSearchParams(queryString);
    if (targetPage <= 1) params.delete("page");
    else params.set("page", String(targetPage));
    const query = params.toString();
    return query ? `/courses?${query}` : "/courses";
  }

  return (
    <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
      <p className="text-sm text-muted-foreground">{summaryLabel({ from, to, total })}</p>
      <div className="flex items-center gap-3">
        {page > 1 ? (
          <Link href={hrefForPage(page - 1)} className={cn(buttonVariants({ variant: "outline" }))}>
            <ChevronLeft aria-hidden="true" className="rtl:rotate-180" />
            {previousLabel}
          </Link>
        ) : (
          <span className={cn(buttonVariants({ variant: "outline" }), "pointer-events-none opacity-50")}>
            <ChevronLeft aria-hidden="true" className="rtl:rotate-180" />
            {previousLabel}
          </span>
        )}
        <span className="min-w-16 text-center text-sm text-muted-foreground">
          {page} / {totalPages}
        </span>
        {page < totalPages ? (
          <Link href={hrefForPage(page + 1)} className={cn(buttonVariants({ variant: "outline" }))}>
            {nextLabel}
            <ChevronRight aria-hidden="true" className="rtl:rotate-180" />
          </Link>
        ) : (
          <span className={cn(buttonVariants({ variant: "outline" }), "pointer-events-none opacity-50")}>
            {nextLabel}
            <ChevronRight aria-hidden="true" className="rtl:rotate-180" />
          </span>
        )}
      </div>
    </div>
  );
}
