import { CourseRepository } from "@/courses/repositories/course.repository";
import { slugifyTitle } from "@/lib/generate-slug";

/**
 * The collision-proof slug for a new course — the article contract
 * (`blog/utils/generate-slug.ts`) applied to courses: authors never see
 * or set slugs, so this appends `-2`, `-3`, … until free, with a
 * time-stamp fallback against pathological contention. Create-time only:
 * a published course's slug never changes (stable links), even if its
 * title does.
 */
export async function generateUniqueCourseSlug(title: string): Promise<string> {
  const base = slugifyTitle(title, "course");
  if (!(await CourseRepository.findBySlug(base))) return base;
  for (let n = 2; n <= 50; n += 1) {
    const candidate = `${base}-${n}`;
    if (!(await CourseRepository.findBySlug(candidate))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}
