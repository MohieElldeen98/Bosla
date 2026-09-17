import { logger } from "@/lib/logger";
import type { NewsletterActionResult } from "@/newsletter/types/result";

/** Same resilience pattern as every other domain's `safeRead`/
 *  `safeMutation` (`contact/utils/safe-operation.ts`, `cms/utils/
 *  safe-operation.ts`) — own copy per domain by established convention. */
export async function safeRead<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error("[newsletter]", error);
    return fallback;
  }
}

export async function safeMutation<T>(
  operation: () => Promise<NewsletterActionResult<T>>,
): Promise<NewsletterActionResult<T>> {
  try {
    return await operation();
  } catch (error) {
    logger.error("[newsletter]", error);
    return {
      success: false,
      code: "unknown",
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}
