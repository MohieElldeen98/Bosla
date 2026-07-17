import { CourseCatalogSkeletonGrid } from "@/components/courses/CourseCardSkeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
      <CourseCatalogSkeletonGrid />
    </div>
  );
}
