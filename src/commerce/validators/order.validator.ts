import { z } from "zod";
import { ORDER_STATUSES } from "@/commerce/types/order";
import { ORDER_SORT_DIRECTIONS, ORDER_SORT_FIELDS } from "@/commerce/types/order-search";

/** The Checkout flow's own input — `studentId` is never part of this:
 *  a Server Action always resolves "who's checking out" from the
 *  session itself (the trust boundary), same reasoning
 *  `getMyDashboardAction` never accepts a caller-supplied student id. */
export const createCheckoutSchema = z.object({
  courseId: z.string().uuid(),
  couponCode: z.string().trim().min(1).max(64).optional(),
});
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;

/** Parses the admin Orders listing's URL search params — mirrors
 *  `learning/validators/enrollment.validator.ts`'s `searchEnrollmentsSchema`
 *  exactly: every field optional and defensively coerced. */
export const searchOrdersSchema = z.object({
  query: z.string().trim().min(1).optional(),
  studentId: z.string().uuid().optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  sortBy: z.enum(ORDER_SORT_FIELDS).optional(),
  sortDirection: z.enum(ORDER_SORT_DIRECTIONS).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
export type SearchOrdersInput = z.infer<typeof searchOrdersSchema>;

/** The admin "Refund"/"Cancel" actions' shared shape — just the id plus
 *  the optimistic-concurrency baseline, same pattern
 *  `revokeEnrollmentAction`/`restoreEnrollmentAction` use. */
export const orderIdSchema = z.object({
  id: z.string().uuid(),
  expectedUpdatedAt: z.string().optional(),
});
export type OrderIdInput = z.infer<typeof orderIdSchema>;
