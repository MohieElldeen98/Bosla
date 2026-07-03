import { logger } from "@/lib/logger";
import type { InstructorActionResult } from "@/instructor/types/result";

/**
 * The Instructor Domain's own copy of `commerce/utils/safe-operation.ts`'s
 * `safeRead`/`safeMutation` — same resilience pattern, kept separate per
 * this codebase's one-copy-per-domain convention.
 */
export async function safeRead<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error("[instructor]", error);
    return fallback;
  }
}

export async function safeMutation<T>(
  operation: () => Promise<InstructorActionResult<T>>,
): Promise<InstructorActionResult<T>> {
  try {
    return await operation();
  } catch (error) {
    logger.error("[instructor]", error);
    return {
      success: false,
      code: "unknown",
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}
