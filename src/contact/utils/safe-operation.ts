import { logger } from "@/lib/logger";
import type { ContactActionResult } from "@/contact/types/result";

/** Same resilience pattern as every other domain's `safeRead`/
 *  `safeMutation` (`cms/utils/safe-operation.ts`, `payments/utils/
 *  safe-operation.ts`) — own copy per domain by established convention. */
export async function safeRead<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error("[contact]", error);
    return fallback;
  }
}

export async function safeMutation<T>(
  operation: () => Promise<ContactActionResult<T>>,
): Promise<ContactActionResult<T>> {
  try {
    return await operation();
  } catch (error) {
    logger.error("[contact]", error);
    return {
      success: false,
      code: "unknown",
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}
