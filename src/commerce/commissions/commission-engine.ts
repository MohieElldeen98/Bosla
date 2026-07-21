import type { CommissionRule } from "@/commerce/types/revenue";

/**
 * The pure math of commission resolution — no I/O, fully testable.
 * `resolveRule` picks the winning rule from the effective candidates
 * the repository fetched (most specific scope wins: course >
 * instructor > global; within a scope, the most recently effective —
 * the repository already orders by `effectiveFrom` desc).
 * `computeShare` turns a rule + basis into an amount, clamped into
 * [0, basis] so no rule can ever allocate more than the sale earned.
 */
const SCOPE_PRIORITY: Record<CommissionRule["scope"], number> = {
  course: 3,
  instructor: 2,
  global: 1,
};

export function resolveCommissionRule(candidates: CommissionRule[]): CommissionRule | null {
  let winner: CommissionRule | null = null;
  for (const candidate of candidates) {
    if (!winner || SCOPE_PRIORITY[candidate.scope] > SCOPE_PRIORITY[winner.scope]) {
      winner = candidate;
    }
    // Equal priority: candidates arrive newest-effectiveFrom first, so
    // the first one seen for a scope already wins.
  }
  return winner;
}

export function computeCommissionShare(rule: CommissionRule, basisAmount: string): string {
  const basis = Number(basisAmount);
  const value = Number(rule.rateValue);
  const raw = rule.rateType === "percentage" ? (basis * value) / 100 : value;
  const clamped = Math.min(Math.max(raw, 0), Math.max(basis, 0));
  return (Math.round(clamped * 100) / 100).toFixed(2);
}
