import { logger } from "@/lib/logger";
import type { JobActionResult } from "@/jobs/types";

/** Same resilience pattern as every other domain's own copy
 *  (`cms/utils/safe-operation.ts`, …) — a DB failure degrades to a safe
 *  fallback for reads, or a clean `JobActionResult` failure for
 *  mutations, never an uncaught throw out of a Server Action. */
export async function safeRead<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error("[jobs]", error);
    return fallback;
  }
}

export async function safeMutation<T>(operation: () => Promise<JobActionResult<T>>): Promise<JobActionResult<T>> {
  try {
    return await operation();
  } catch (error) {
    logger.error("[jobs]", error);
    return {
      success: false,
      code: "unknown",
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}
