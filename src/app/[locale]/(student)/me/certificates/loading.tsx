import { Skeleton } from "@/components/courses/CourseCardSkeleton";

export default function WorkspaceCertificatesLoading() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-24 rounded-2xl" />
      ))}
    </div>
  );
}
