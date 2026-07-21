import { logger } from "@/lib/logger";
import type { PaymentActionResult } from "@/payments/types/result";

/**
 * The Payment Platform's copy of the per-domain `safeRead`/`safeMutation`
 * resilience pattern (`commerce/utils/safe-operation.ts` et al.) — a DB
 * failure degrades to a safe fallback for reads, or a clean
 * `PaymentActionResult` failure for mutations, never an uncaught throw
 * out of a Server Action.
 */
export async function safeRead<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error("[payments]", error);
    return fallback;
  }
}

export async function safeMutation<T>(
  operation: () => Promise<PaymentActionResult<T>>,
): Promise<PaymentActionResult<T>> {
  try {
    return await operation();
  } catch (error) {
    logger.error("[payments]", error);
    return {
      success: false,
      code: "unknown",
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}
