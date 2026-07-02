import { logger } from "@/lib/logger";
import type { CourseActionResult } from "@/courses/types/result";

/**
 * The same resilience pattern as `cms/utils/safe-operation.ts`'s
 * `safeRead`/`safeMutation` and `AuthService`'s `runAuthOperation` — each
 * domain keeps its own copy rather than sharing one cross-domain util (the
 * established precedent: Auth's `profile.service.ts` doesn't import CMS's
 * copy either). A DB failure degrades to a safe fallback for reads, or a
 * clean `CourseActionResult` failure for mutations — never an uncaught
 * throw out of a Server Action.
 */
export async function safeRead<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error("[courses]", error);
    return fallback;
  }
}

export async function safeMutation<T>(
  operation: () => Promise<CourseActionResult<T>>,
): Promise<CourseActionResult<T>> {
  try {
    return await operation();
  } catch (error) {
    logger.error("[courses]", error);
    return {
      success: false,
      code: "unknown",
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}
