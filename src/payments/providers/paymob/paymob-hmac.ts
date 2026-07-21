import { createHmac } from "node:crypto";
import { timingSafeEqualStrings } from "@/payments/security/timing-safe";
import type { PaymobTransaction } from "@/payments/providers/paymob/paymob-types";

/**
 * Paymob's transaction-callback HMAC scheme: SHA-512 over the
 * lexicographically-ordered concatenation of exactly these transaction
 * fields (booleans as `"true"`/`"false"`, missing values as empty
 * string), keyed with the dashboard's HMAC secret, hex-encoded, and
 * delivered in the request's `hmac` query parameter. The field list is
 * Paymob's contract, not ours — do not "improve" it.
 */
const HMAC_FIELD_ORDER = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order.id",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
] as const;

function fieldToString(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function pick(transaction: PaymobTransaction, path: string): unknown {
  if (path === "order.id") return transaction.order?.id;
  if (path.startsWith("source_data.")) {
    return transaction.source_data?.[path.slice("source_data.".length)];
  }
  return transaction[path];
}

export function computePaymobTransactionHmac(transaction: PaymobTransaction, hmacSecret: string): string {
  const concatenated = HMAC_FIELD_ORDER.map((path) => fieldToString(pick(transaction, path))).join("");
  return createHmac("sha512", hmacSecret).update(concatenated, "utf8").digest("hex");
}

export function verifyPaymobTransactionHmac(
  transaction: PaymobTransaction,
  receivedHmac: string,
  hmacSecret: string,
): boolean {
  const expected = computePaymobTransactionHmac(transaction, hmacSecret);
  return timingSafeEqualStrings(expected, receivedHmac.toLowerCase());
}
