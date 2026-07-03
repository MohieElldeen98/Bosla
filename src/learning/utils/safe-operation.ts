import { logger } from "@/lib/logger";
import type { LearningActionResult } from "@/learning/types/result";

/**
 * The same resilience pattern as `courses/utils/safe-operation.ts`'s
 * `safeRead`/`safeMutation` (and `cms`'s, and Auth's `runAuthOperation`)
 * — each domain keeps its own copy rather than sharing one cross-domain
 * util, per this codebase's established precedent. A DB failure degrades
 * to a safe fallback for reads, or a clean `LearningActionResult` failure
 * for mutations — never an uncaught throw out of a Server Action.
 */
export async function safeRead<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error("[learning]", error);
    return fallback;
  }
}

export async function safeMutation<T>(
  operation: () => Promise<LearningActionResult<T>>,
): Promise<LearningActionResult<T>> {
  try {
    return await operation();
  } catch (error) {
    logger.error("[learning]", error);
    return {
      success: false,
      code: "unknown",
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}
