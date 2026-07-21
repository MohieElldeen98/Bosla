import { Skeleton } from "@/components/courses/CourseCardSkeleton";

export default function WorkspaceOrdersLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
