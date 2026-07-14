import { logger } from "@/lib/logger";
import type { BlogActionResult } from "@/blog/types/result";

/**
 * The same resilience pattern as `courses/utils/safe-operation.ts` — each
 * domain keeps its own copy rather than sharing one cross-domain util (the
 * established precedent). A DB failure degrades to a safe fallback for
 * reads, or a clean `BlogActionResult` failure for mutations — never an
 * uncaught throw out of a Server Action.
 */
export async function safeRead<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error("[blog]", error);
    return fallback;
  }
}

export async function safeMutation<T>(
  operation: () => Promise<BlogActionResult<T>>,
): Promise<BlogActionResult<T>> {
  try {
    return await operation();
  } catch (error) {
    logger.error("[blog]", error);
    return {
      success: false,
      code: "unknown",
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}
