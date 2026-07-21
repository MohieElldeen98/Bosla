import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time string comparison for webhook signatures — a plain
 * `===` leaks how many leading characters matched through response
 * timing, which is exactly the oracle an attacker forging HMACs needs.
 * Length mismatch returns false immediately (length is not secret).
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
