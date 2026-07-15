import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The windowed page-number list: always the first and last page, the
 * current page ±1, and `null` markers where pages were elided (rendered
 * as "…"). E.g. page 6 of 20 → [1, null, 5, 6, 7, null, 20].
 */
function pageNumbers(page: number, totalPages: number): (number | null)[] {
  const wanted = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const pages = [...wanted].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);

  const result: (number | null)[] = [];
  let previous = 0;
  for (const n of pages) {
    if (previous && n - previous > 1) result.push(null);
    result.push(n);
    previous = n;
  }
  return result;
}

/**
 * The public blog's pagination — `CourseCatalogPagination`'s link-based
 * pattern (crawlable, works without JS), pointed at `/blog`, plus
 * numbered page buttons with ellipsis windowing. Kept as the blog's own
 * copy per the codebase's per-domain-copy convention.
 */
export function BlogPagination({
  page,
  totalPages,
  total,
  pageSize,
  queryString,
  summaryLabel,
  previousLabel,
  nextLabel,
  basePath = "/blog",
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  queryString: string;
  summaryLabel: (range: { from: number; to: number; total: number }) => string;
  previousLabel: string;
  nextLabel: string;
  /** The paginated route — `/blog` (default) or `/blog/my`. */
  basePath?: string;
}) {
  if (total === 0 || totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  function hrefForPage(targetPage: number): string {
    const params = new URLSearchParams(queryString);
    if (targetPage <= 1) params.delete("page");
    else params.set("page", String(targetPage));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  return (
    <nav
      aria-label={summaryLabel({ from, to, total })}
      className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row"
    >
      <p className="text-sm text-muted-foreground">{summaryLabel({ from, to, total })}</p>
      <div className="flex items-center gap-1.5">
        {page > 1 ? (
          <Link
            href={hrefForPage(page - 1)}
            aria-label={previousLabel}
            className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
          >
            <ChevronLeft aria-hidden="true" className="rtl:rotate-180" />
          </Link>
        ) : (
          <span
            className={cn(buttonVariants({ variant: "outline", size: "icon" }), "pointer-events-none opacity-50")}
          >
            <ChevronLeft aria-hidden="true" className="rtl:rotate-180" />
          </span>
        )}

        {pageNumbers(page, totalPages).map((n, index) =>
          n === null ? (
            <span key={`gap-${index}`} className="px-1 text-sm text-muted-foreground" aria-hidden="true">
              …
            </span>
          ) : n === page ? (
            <span
              key={n}
              aria-current="page"
              className={cn(buttonVariants({ variant: "default", size: "icon" }), "pointer-events-none")}
            >
              {n}
            </span>
          ) : (
            <Link key={n} href={hrefForPage(n)} className={cn(buttonVariants({ variant: "outline", size: "icon" }))}>
              {n}
            </Link>
          ),
        )}

        {page < totalPages ? (
          <Link
            href={hrefForPage(page + 1)}
            aria-label={nextLabel}
            className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
          >
            <ChevronRight aria-hidden="true" className="rtl:rotate-180" />
          </Link>
        ) : (
          <span
            className={cn(buttonVariants({ variant: "outline", size: "icon" }), "pointer-events-none opacity-50")}
          >
            <ChevronRight aria-hidden="true" className="rtl:rotate-180" />
          </span>
        )}
      </div>
    </nav>
  );
}
