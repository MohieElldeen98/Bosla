import { logger } from "@/lib/logger";
import type { CmsActionResult } from "@/cms/types/result";

/**
 * The same resilience pattern as `AuthService`'s `runAuthOperation` /
 * `ProfileService`'s `safeRead`/`safeMutation` — extracted once here since
 * every CMS service (six of them) needs it, rather than reimplementing a
 * try/catch per service. A DB failure (unreachable, `DATABASE_URL`
 * missing) degrades to a safe fallback for reads, or a clean
 * `CmsActionResult` failure for mutations — never an uncaught throw out of
 * a Server Action.
 */
export async function safeRead<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error("[cms]", error);
    return fallback;
  }
}

export async function safeMutation<T>(
  operation: () => Promise<CmsActionResult<T>>,
): Promise<CmsActionResult<T>> {
  try {
    return await operation();
  } catch (error) {
    logger.error("[cms]", error);
    return {
      success: false,
      code: "unknown",
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}
