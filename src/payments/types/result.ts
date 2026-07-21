/**
 * The Payment Platform's counterpart to `commerce/types/result.ts`'s
 * `CommerceActionResult` — same shape, its own error vocabulary, per
 * this codebase's one-result-type-per-domain convention.
 * `provider_error` is the payments-specific addition: the provider
 * answered, and the answer was no (declined refund, rejected capture…).
 */
export type PaymentErrorCode =
  | "forbidden"
  | "not_found"
  | "validation_failed"
  | "conflict"
  | "unavailable"
  | "provider_error"
  | "unknown";

export type PaymentActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; code: PaymentErrorCode; message: string };
