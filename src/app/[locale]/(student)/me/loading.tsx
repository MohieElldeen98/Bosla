import { Skeleton } from "@/components/courses/CourseCardSkeleton";

/** Mirrors `WorkspaceOverviewPage`'s section layout — Continue Learning
 *  hero, stats row, two-column certificate/activity, orders card. */
export default function WorkspaceOverviewLoading() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-56 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
      <Skeleton className="h-20 rounded-2xl" />
    </div>
  );
}
