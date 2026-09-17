import {
  CourseCatalogSkeletonGrid,
  Skeleton,
} from "@/components/courses/CourseCardSkeleton";

/**
 * Mirrors the catalog page's real structure (hero band → chips → filter
 * row → grid) so the swap to content doesn't jump — and clears the fixed
 * navbar with the same pt-32 the live hero uses.
 *
 * Deliberately NOT a `loading.tsx`: a `loading.tsx` at `courses/` wraps
 * `courses/[slug]` too, and any Suspense boundary above a segment makes
 * Next flush the response before the page runs — so `notFound()` for an
 * unknown course slug could only ever answer HTTP 200. The catalog page
 * renders this behind its own `<Suspense>` instead, which keeps the
 * skeleton exactly where it belongs and out of every child route.
 */
export function CourseCatalogSkeleton() {
  return (
    <div>
      <section className="border-b border-border bg-muted/40">
        <div className="mx-auto max-w-7xl px-6 pt-32 pb-14 lg:px-8">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-3 h-10 w-56 sm:h-12" />
          <Skeleton className="mt-5 h-5 w-full max-w-xl" />
          <Skeleton className="mt-8 h-12 w-full max-w-3xl rounded-xl" />
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <div className="flex gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-24 rounded-full" />
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-20 rounded-md" />
          ))}
        </div>
        <div className="mt-10">
          <Skeleton className="h-7 w-40" />
          <div className="mt-6">
            <CourseCatalogSkeletonGrid />
          </div>
        </div>
      </div>
    </div>
  );
}
