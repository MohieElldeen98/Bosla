import { logger } from "@/lib/logger";
import type { NotificationActionResult } from "@/notifications/types/result";

/**
 * The same resilience pattern every other domain's `safe-operation.ts`
 * already establishes (`commerce/utils/safe-operation.ts`, `cms/utils/
 * safe-operation.ts`, ...) — each domain keeps its own copy rather than
 * sharing one cross-domain util. A DB failure degrades to a safe
 * fallback for reads, or a clean `NotificationActionResult` failure for
 * mutations — never an uncaught throw out of a Server Action.
 */
export async function safeRead<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error("[notifications]", error);
    return fallback;
  }
}

export async function safeMutation<T>(
  operation: () => Promise<NotificationActionResult<T>>,
): Promise<NotificationActionResult<T>> {
  try {
    return await operation();
  } catch (error) {
    logger.error("[notifications]", error);
    return {
      success: false,
      code: "unknown",
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}
