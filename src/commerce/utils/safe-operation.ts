import { logger } from "@/lib/logger";
import type { CommerceActionResult } from "@/commerce/types/result";

/**
 * The same resilience pattern as `courses/utils/safe-operation.ts`'s
 * `safeRead`/`safeMutation` — each domain keeps its own copy rather than
 * sharing one cross-domain util. A DB failure degrades to a safe
 * fallback for reads, or a clean `CommerceActionResult` failure for
 * mutations — never an uncaught throw out of a Server Action.
 */
export async function safeRead<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error("[commerce]", error);
    return fallback;
  }
}

export async function safeMutation<T>(
  operation: () => Promise<CommerceActionResult<T>>,
): Promise<CommerceActionResult<T>> {
  try {
    return await operation();
  } catch (error) {
    logger.error("[commerce]", error);
    return {
      success: false,
      code: "unknown",
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}
