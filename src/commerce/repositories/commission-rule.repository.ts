import { and, desc, eq, gt, inArray, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { commissionRules } from "@/db/schema/revenue";
import type { CommissionRule, NewCommissionRuleInput } from "@/commerce/types/revenue";
import type { OptimisticUpdateResult } from "@/commerce/types/repository-result";

type CommissionRuleRow = typeof commissionRules.$inferSelect;

function mapRow(row: CommissionRuleRow): CommissionRule {
  return {
    id: row.id,
    scope: row.scope,
    scopeId: row.scopeId,
    recipientType: row.recipientType,
    rateType: row.rateType,
    rateValue: row.rateValue,
    effectiveFrom: row.effectiveFrom.toISOString(),
    effectiveTo: row.effectiveTo ? row.effectiveTo.toISOString() : null,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Data access for `commission_rules`. `CommissionService` is the only
 *  caller. Rules are never re-rated: mutation surface is create + close
 *  (`effectiveTo`), full stop. */
export const CommissionRuleRepository = {
  async create(input: NewCommissionRuleInput): Promise<CommissionRule> {
    const [row] = await getDb()
      .insert(commissionRules)
      .values({
        scope: input.scope,
        scopeId: input.scopeId ?? null,
        recipientType: input.recipientType ?? "instructor",
        rateType: input.rateType,
        rateValue: input.rateValue,
        effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : new Date(),
        createdByUserId: input.createdByUserId ?? null,
        updatedAt: new Date(),
      })
      .returning();
    return mapRow(row);
  },

  async findById(id: string): Promise<CommissionRule | null> {
    const [row] = await getDb().select().from(commissionRules).where(eq(commissionRules.id, id)).limit(1);
    return row ? mapRow(row) : null;
  },

  /** Every rule whose window covers `at` for one recipient type, across
   *  the three scopes relevant to one sale — the Commission Engine
   *  picks the most specific (course > instructor > global). */
  async findEffectiveCandidates(params: {
    recipientType: string;
    courseId: string;
    instructorId: string;
    at: Date;
  }): Promise<CommissionRule[]> {
    const rows = await getDb()
      .select()
      .from(commissionRules)
      .where(
        and(
          eq(commissionRules.recipientType, params.recipientType),
          lte(commissionRules.effectiveFrom, params.at),
          or(isNull(commissionRules.effectiveTo), gt(commissionRules.effectiveTo, params.at)),
          or(
            and(eq(commissionRules.scope, "course"), eq(commissionRules.scopeId, params.courseId)),
            and(eq(commissionRules.scope, "instructor"), eq(commissionRules.scopeId, params.instructorId)),
            eq(commissionRules.scope, "global"),
          ),
        ),
      )
      // Newest effectiveFrom first within each scope, so overlapping
      // windows resolve to the most recently effective rule.
      .orderBy(desc(commissionRules.effectiveFrom));
    return rows.map(mapRow);
  },

  async list(filters?: { scope?: CommissionRule["scope"]; activeOnly?: boolean }): Promise<CommissionRule[]> {
    const conditions: SQL[] = [];
    if (filters?.scope) conditions.push(eq(commissionRules.scope, filters.scope));
    if (filters?.activeOnly) {
      conditions.push(
        or(isNull(commissionRules.effectiveTo), gt(commissionRules.effectiveTo, new Date())) as SQL,
      );
    }
    const rows = await getDb()
      .select()
      .from(commissionRules)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(commissionRules.createdAt));
    return rows.map(mapRow);
  },

  async findByIds(ids: string[]): Promise<CommissionRule[]> {
    if (ids.length === 0) return [];
    const rows = await getDb().select().from(commissionRules).where(inArray(commissionRules.id, ids));
    return rows.map(mapRow);
  },

  /** Close a rule's window (optimistic) — sales already priced by it
   *  keep referencing it forever; it just stops applying to new ones. */
  async close(id: string, effectiveTo: Date, expectedUpdatedAt?: string): Promise<OptimisticUpdateResult<CommissionRule>> {
    const conditions = [eq(commissionRules.id, id), isNull(commissionRules.effectiveTo)];
    if (expectedUpdatedAt) conditions.push(eq(commissionRules.updatedAt, new Date(expectedUpdatedAt)));

    const [row] = await getDb()
      .update(commissionRules)
      .set({ effectiveTo, updatedAt: new Date() })
      .where(and(...conditions, sql`${commissionRules.effectiveFrom} < ${effectiveTo}`))
      .returning();

    if (row) return { status: "ok", data: mapRow(row) };
    const stillExists = await CommissionRuleRepository.findById(id);
    return stillExists ? { status: "conflict" } : { status: "not_found" };
  },
};
