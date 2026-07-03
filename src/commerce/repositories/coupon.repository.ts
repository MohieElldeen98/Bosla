import { and, asc, desc, eq, ilike, inArray, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { coupons } from "@/db/schema/commerce";
import {
  DEFAULT_COUPON_PAGE_SIZE,
  DEFAULT_COUPON_SORT_DIRECTION,
  DEFAULT_COUPON_SORT_FIELD,
  type CouponSearchFilters,
  type CouponSearchResult,
} from "@/commerce/types/coupon-search";
import type { Coupon, NewCouponInput } from "@/commerce/types/coupon";
import type { OptimisticUpdateResult } from "@/commerce/types/repository-result";

type CouponRow = typeof coupons.$inferSelect;

export interface UpdateCouponRow {
  discountType?: Coupon["discountType"];
  discountValue?: string;
  scope?: Coupon["scope"];
  scopeId?: string | null;
  maxRedemptions?: number | null;
  expiresAt?: Date | null;
  isActive?: boolean;
}

const SORT_COLUMNS = {
  createdAt: coupons.createdAt,
  code: coupons.code,
  expiresAt: coupons.expiresAt,
} as const;

function mapRowToCoupon(row: CouponRow): Coupon {
  return {
    id: row.id,
    code: row.code,
    discountType: row.discountType,
    discountValue: row.discountValue,
    scope: row.scope,
    scopeId: row.scopeId,
    maxRedemptions: row.maxRedemptions,
    redeemedCount: row.redeemedCount,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    isActive: row.isActive,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Data access for `coupons`. `CouponService` is the only caller. */
export const CouponRepository = {
  async create(input: NewCouponInput): Promise<Coupon> {
    const [row] = await getDb()
      .insert(coupons)
      .values({
        code: input.code,
        discountType: input.discountType,
        discountValue: input.discountValue,
        scope: input.scope,
        scopeId: input.scopeId ?? null,
        maxRedemptions: input.maxRedemptions ?? null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        isActive: input.isActive ?? true,
        createdByUserId: input.createdByUserId ?? null,
        updatedAt: new Date(),
      })
      .returning();
    return mapRowToCoupon(row);
  },

  async findById(id: string): Promise<Coupon | null> {
    const [row] = await getDb().select().from(coupons).where(eq(coupons.id, id)).limit(1);
    return row ? mapRowToCoupon(row) : null;
  },

  /** Case-insensitive — `CouponService` always uppercases a submitted
   *  code before calling this, but a lookup-only caller (checkout
   *  validation) shouldn't have to duplicate that normalization to get
   *  a match. */
  async findByCode(code: string): Promise<Coupon | null> {
    const [row] = await getDb()
      .select()
      .from(coupons)
      .where(sql`upper(${coupons.code}) = upper(${code})`)
      .limit(1);
    return row ? mapRowToCoupon(row) : null;
  },

  async search(filters: CouponSearchFilters): Promise<CouponSearchResult<Coupon>> {
    const conditions: SQL[] = [];

    if (filters.query) conditions.push(ilike(coupons.code, `%${filters.query}%`));
    if (filters.scope) conditions.push(eq(coupons.scope, filters.scope));
    if (filters.scopeIds) conditions.push(inArray(coupons.scopeId, filters.scopeIds));
    if (filters.isActive !== undefined) conditions.push(eq(coupons.isActive, filters.isActive));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const sortColumn = SORT_COLUMNS[filters.sortBy ?? DEFAULT_COUPON_SORT_FIELD];
    const orderFn = (filters.sortDirection ?? DEFAULT_COUPON_SORT_DIRECTION) === "asc" ? asc : desc;
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = filters.pageSize ?? DEFAULT_COUPON_PAGE_SIZE;

    const [rows, countRows] = await Promise.all([
      getDb()
        .select()
        .from(coupons)
        .where(whereClause)
        .orderBy(orderFn(sortColumn))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      getDb()
        .select({ count: sql<number>`count(*)::int` })
        .from(coupons)
        .where(whereClause),
    ]);
    const total = countRows[0]?.count ?? 0;

    return {
      items: rows.map(mapRowToCoupon),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  async update(
    id: string,
    input: UpdateCouponRow,
    expectedUpdatedAt?: string,
  ): Promise<OptimisticUpdateResult<Coupon>> {
    const conditions = [eq(coupons.id, id)];
    if (expectedUpdatedAt) conditions.push(eq(coupons.updatedAt, new Date(expectedUpdatedAt)));

    const [row] = await getDb()
      .update(coupons)
      .set({ ...input, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();

    if (row) return { status: "ok", data: mapRowToCoupon(row) };
    if (!expectedUpdatedAt) return { status: "not_found" };

    const stillExists = await CouponRepository.findById(id);
    return stillExists ? { status: "conflict" } : { status: "not_found" };
  },

  /** Atomic increment, not read-modify-write — two orders redeeming the
   *  same coupon at nearly the same moment must both be counted, never
   *  lose one to a race. Called only from `OrderService.markPaid`, once
   *  per paid order that had a coupon attached. */
  async incrementRedeemedCount(id: string): Promise<void> {
    await getDb()
      .update(coupons)
      .set({ redeemedCount: sql`${coupons.redeemedCount} + 1`, updatedAt: new Date() })
      .where(eq(coupons.id, id));
  },
};
