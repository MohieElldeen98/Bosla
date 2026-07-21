import { logger } from "@/lib/logger";
import type { CertificateActionResult } from "@/certificates/types/result";

/** The Certificates domain's copy of the per-domain `safeRead`/
 *  `safeMutation` resilience pattern (`payments/utils/safe-operation.ts`
 *  et al.). */
export async function safeRead<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error("[certificates]", error);
    return fallback;
  }
}

export async function safeMutation<T>(
  operation: () => Promise<CertificateActionResult<T>>,
): Promise<CertificateActionResult<T>> {
  try {
    return await operation();
  } catch (error) {
    logger.error("[certificates]", error);
    return {
      success: false,
      code: "unknown",
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}
