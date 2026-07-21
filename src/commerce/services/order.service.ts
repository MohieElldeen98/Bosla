import { OrderRepository } from "@/commerce/repositories/order.repository";
import { OrderItemRepository } from "@/commerce/repositories/order-item.repository";
import { CouponService } from "@/commerce/services/coupon.service";
import { CouponRepository } from "@/commerce/repositories/coupon.repository";
import { CouponRedemptionRepository } from "@/commerce/repositories/coupon-redemption.repository";
import { PaymentRepository } from "@/payments/repositories/payment.repository";
import { InvoiceRepository } from "@/payments/repositories/invoice.repository";
import { PricingService } from "@/payments/pricing/pricing.service";
import { RevenueEngine } from "@/commerce/revenue/revenue-engine.service";
import { CourseRepository } from "@/courses/repositories/course.repository";
import { CourseService } from "@/courses/services/course.service";
import { EnrollmentRepository } from "@/learning/repositories/enrollment.repository";
import { ProfileService } from "@/auth/services/profile.service";
import { canAccessStudentData } from "@/commerce/utils/require-student-access";
import { requireCommerceManagementAccess } from "@/commerce/utils/require-commerce-access";
import { recordOrderAuditLog } from "@/commerce/utils/audit-log";
import { OrderAuditLogRepository } from "@/commerce/repositories/order-audit-log.repository";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { safeMutation, safeRead } from "@/commerce/utils/safe-operation";
import { notify } from "@/notifications/utils/notify";
import { buildNotificationContent } from "@/notifications/utils/notification-content";
import type { Locale } from "@/i18n/routing";
import type { AuthUser } from "@/auth/types/session";
import type { Enrollment } from "@/learning/types/enrollment";
import type { OrderAuditLogEntry, TimelineActorType } from "@/commerce/types/order-audit-log";
import type { Order } from "@/commerce/types/order";
import type { Payment } from "@/payments/types/payment";
import type { OrderListItem, OrderSearchFilters, OrderSearchResult } from "@/commerce/types/order-search";
import type { InstructorEarningsSummary } from "@/commerce/types/instructor-earnings";
import type { CommerceActionResult } from "@/commerce/types/result";
import type { CreateCheckoutInput } from "@/commerce/validators/order.validator";

/** What `createFromCheckout` hands the Payment Platform's
 *  `CheckoutService` (the only caller): the order, and whether it
 *  completed immediately ($0 total — nothing to collect). Payment
 *  execution itself is entirely the platform's concern from here on. */
export interface CheckoutResult {
  order: Order;
  isFree: boolean;
}

/** Creates the enrollment a paid order grants, or restores a previously
 *  revoked one — never a second `INSERT` against the unique
 *  `(student, course)` slot. Shared by both the $0-checkout completion
 *  path and `markPaid`, so "how a purchase becomes access" exists in
 *  exactly one place. Returns the resulting row (rather than `void`) so
 *  `completeOrder` can put its id in the `new_enrollment` notification's
 *  `data`. */
async function grantEnrollmentForOrder(studentId: string, courseId: string): Promise<Enrollment> {
  const existing = await EnrollmentRepository.findByStudentAndCourse(studentId, courseId);
  if (!existing) {
    return EnrollmentRepository.create({ studentId, courseId, source: "purchase" });
  }
  if (existing.status !== "active") {
    const result = await EnrollmentRepository.updateStatus(existing.id, "active", existing.updatedAt);
    if (result.status === "ok") return result.data;
  }
  return existing;
}

/** Notifies the student who just paid — one `new_enrollment` and one
 *  `course_purchased` row per course in the order, plus one `order_paid`
 *  row for the order itself. Best-effort (see `notify`'s own doc
 *  comment): called only after `completeOrder`'s own mutations have
 *  already succeeded, so a notification failure never turns a completed
 *  purchase into a reported error. */
async function notifyOrderCompleted(
  order: Order,
  items: { courseId: string }[],
  enrollments: Enrollment[],
): Promise<void> {
  const courses = await safeRead(() => CourseRepository.findByIds(items.map((item) => item.courseId)), []);
  const courseById = new Map(courses.map((course) => [course.id, course]));

  await Promise.all(
    items.map(async (item, index) => {
      const course = courseById.get(item.courseId);
      if (!course) return;
      const enrollment = enrollments[index];

      const enrollmentContent = await buildNotificationContent("newEnrollment", { courseTitle: course.title });
      await notify({
        recipientUserId: order.studentId,
        type: "new_enrollment",
        ...enrollmentContent,
        data: { enrollmentId: enrollment.id, courseId: course.id, courseSlug: course.slug, orderId: order.id },
      });

      const purchaseContent = await buildNotificationContent("coursePurchased", { courseTitle: course.title });
      await notify({
        recipientUserId: order.studentId,
        type: "course_purchased",
        ...purchaseContent,
        data: { orderId: order.id, courseId: course.id, courseSlug: course.slug },
      });
    }),
  );

  const paidContent = await buildNotificationContent("orderPaid", { orderRef: order.id.slice(0, 8) });
  await notify({
    recipientUserId: order.studentId,
    type: "order_paid",
    ...paidContent,
    data: { orderId: order.id },
  });
}

/** The single "this order is now paid" completion path — grants the
 *  enrollment, increments the coupon's redemption count (if one was
 *  used), and audit-logs `order_paid`. Called from both a $0 checkout
 *  (`createFromCheckout`) and a successful payment (`markPaid`), so
 *  neither duplicates the other's completion logic. */
async function completeOrder(
  order: Order,
  actorId: string | null,
  paymentId?: string | null,
  actorType: TimelineActorType = "system",
): Promise<void> {
  const items = await OrderItemRepository.findByOrderId(order.id);
  const enrollments = await Promise.all(
    items.map((item) => grantEnrollmentForOrder(order.studentId, item.courseId)),
  );
  await recordOrderAuditLog({
    action: "enrollment.granted",
    orderId: order.id,
    paymentId: paymentId ?? null,
    actorType,
    actorId,
    message: `Enrollment granted for ${enrollments.length} course(s).`,
    metadata: { courseIds: items.map((item) => item.courseId), enrollmentIds: enrollments.map((e) => e.id) },
  });

  // The Revenue Engine turns this sale into ledger rows + instructor
  // balances (docs/revenue-platform.md). Idempotent and non-throwing —
  // a revenue hiccup never undoes the enrollment above.
  const allocations = await RevenueEngine.allocateForOrder(order, { paymentId: paymentId ?? null });
  if (allocations.length > 0) {
    await recordOrderAuditLog({
      action: "revenue.allocated",
      orderId: order.id,
      paymentId: paymentId ?? null,
      actorType: "system",
      actorId: null,
      message: `${allocations.length} revenue allocation row(s) recorded.`,
      metadata: { allocationCount: allocations.length },
    });
  }

  if (order.couponId) {
    // The redemption record is the per-user usage history (idempotent
    // per order); the counter stays as the cheap global-limit aggregate.
    const recorded = await CouponRedemptionRepository.record(order.couponId, order.id, order.studentId);
    if (recorded) {
      await CouponRepository.incrementRedeemedCount(order.couponId);
    }
  }

  await recordOrderAuditLog({
    action: "order_paid",
    orderId: order.id,
    paymentId: paymentId ?? null,
    actorType,
    actorId,
  });
  await notifyOrderCompleted(order, items, enrollments);
}

async function resolveOrders(rows: Order[], locale: Locale): Promise<OrderListItem[]> {
  if (rows.length === 0) return [];

  const orderIds = rows.map((o) => o.id);
  const [items, profiles, orderPayments, orderInvoices, coupons] = await Promise.all([
    safeRead(() => OrderItemRepository.findByOrderIds(orderIds), []),
    ProfileService.getByUserIds([...new Set(rows.map((o) => o.studentId))]),
    safeRead(() => PaymentRepository.findByOrderIds(orderIds), []),
    safeRead(() => InvoiceRepository.findByOrderIds(orderIds), []),
    Promise.all(
      [...new Set(rows.filter((o) => o.couponId).map((o) => o.couponId!))].map((id) => CouponService.getById(id)),
    ),
  ]);

  const courseIds = [...new Set(items.map((i) => i.courseId))];
  const courses = await safeRead(() => CourseRepository.findByIds(courseIds), []);

  const itemByOrderId = new Map(items.map((i) => [i.orderId, i]));
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const profileByUserId = new Map(profiles.map((p) => [p.userId, p]));
  const couponById = new Map(coupons.filter((c): c is NonNullable<typeof c> => c !== null).map((c) => [c.id, c]));

  const invoiceByOrderId = new Map(orderInvoices.map((invoice) => [invoice.orderId, invoice]));

  const latestPaymentByOrderId = new Map<string, Payment>();
  for (const payment of orderPayments) {
    if (!latestPaymentByOrderId.has(payment.orderId)) {
      latestPaymentByOrderId.set(payment.orderId, payment);
    }
  }

  return rows.map((order): OrderListItem => {
    const item = itemByOrderId.get(order.id);
    const course = item ? courseById.get(item.courseId) : undefined;
    const student = profileByUserId.get(order.studentId);
    const coupon = order.couponId ? couponById.get(order.couponId) : undefined;

    return {
      id: order.id,
      studentId: order.studentId,
      studentName: student?.displayName ?? student?.fullName ?? student?.email ?? order.studentId,
      studentEmail: student?.email ?? "",
      courseId: item?.courseId ?? "",
      courseTitle: course ? resolveLocalizedText(course.title, locale) : "",
      courseSlug: course?.slug ?? "",
      status: order.status,
      subtotal: order.subtotal,
      discountTotal: order.discountTotal,
      taxTotal: order.taxTotal,
      total: order.total,
      currency: order.currency,
      couponCode: coupon?.code ?? null,
      latestPaymentStatus: latestPaymentByOrderId.get(order.id)?.status ?? null,
      invoiceId: invoiceByOrderId.get(order.id)?.id ?? null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  });
}

/**
 * Orchestration for `orders`/`order_items` — the Commerce Domain's
 * checkout entry point. `createFromCheckout` is where duplicate-purchase
 * prevention, course-availability validation, and coupon locking all
 * happen; completion has exactly two doors — the Payment Platform's
 * webhook-verified `completeFromVerifiedPayment` (the normal path) and
 * the management-only `markPaid` override (payment received
 * out-of-band). `cancel`/`refund` are
 * Admin/Super-Admin-only (`requireCommerceManagementAccess`), matching
 * docs/roles-and-permissions.md §2's "View/manage all orders & process
 * refunds" row.
 */
export const OrderService = {
  async getById(id: string): Promise<Order | null> {
    return safeRead(() => OrderRepository.findById(id), null);
  },

  async getResolvedById(
    actingUser: AuthUser,
    id: string,
    locale: Locale,
  ): Promise<CommerceActionResult<OrderListItem>> {
    const order = await OrderRepository.findById(id);
    if (!order) {
      return { success: false, code: "not_found", message: "Order not found." };
    }
    if (!canAccessStudentData(actingUser, order.studentId)) {
      return { success: false, code: "forbidden", message: "You cannot view this order." };
    }
    const [resolved] = await resolveOrders([order], locale);
    return { success: true, data: resolved };
  },

  /** The Admin Order Details page's Timeline section
   *  (docs/payment-platform.md §Timeline) — every event recorded
   *  against this order, chronological, immutable. Same access rule as
   *  `getResolvedById`. */
  async getTimeline(actingUser: AuthUser, orderId: string): Promise<CommerceActionResult<OrderAuditLogEntry[]>> {
    const order = await OrderRepository.findById(orderId);
    if (!order) {
      return { success: false, code: "not_found", message: "Order not found." };
    }
    if (!canAccessStudentData(actingUser, order.studentId)) {
      return { success: false, code: "forbidden", message: "You cannot view this order." };
    }
    const entries = await safeRead(() => OrderAuditLogRepository.findByOrderId(orderId), []);
    return { success: true, data: entries };
  },

  /** The Student Dashboard's Orders & Billing page. */
  async listForStudent(
    actingUser: AuthUser,
    studentId: string,
    locale: Locale,
  ): Promise<CommerceActionResult<OrderListItem[]>> {
    if (!canAccessStudentData(actingUser, studentId)) {
      return { success: false, code: "forbidden", message: "You cannot view this student's orders." };
    }
    const rows = await safeRead(() => OrderRepository.findByStudentId(studentId), []);
    const resolved = await resolveOrders(rows, locale);
    return { success: true, data: resolved };
  },

  /** The admin Orders listing. Reads are unrestricted here by the same
   *  convention every other admin listing's service method uses — the
   *  route guard (`/admin/orders`) is the boundary, not this method. */
  async searchResolved(filters: OrderSearchFilters, locale: Locale): Promise<OrderSearchResult<OrderListItem>> {
    const result = await safeRead(() => OrderRepository.search(filters), {
      items: [] as Order[],
      total: 0,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 20,
      totalPages: 1,
    });
    const items = await resolveOrders(result.items, locale);
    return { ...result, items };
  },

  /**
   * The real checkout flow. Always checks out for `actingUser`'s own
   * id — there is no "admin buys on behalf of a student" concept, same
   * reasoning `getMyDashboardAction` never accepts a caller-supplied
   * student id. A course that's free (or a coupon that brings the total
   * to $0) completes immediately, no payment needed at all —
   * there's nothing to collect.
   */
  async createFromCheckout(
    actingUser: AuthUser,
    input: CreateCheckoutInput,
  ): Promise<CommerceActionResult<CheckoutResult>> {
    return safeMutation(async () => {
      const studentId = actingUser.id;

      const course = await CourseRepository.findById(input.courseId);
      if (!course) {
        return { success: false, code: "not_found", message: "Course not found." };
      }
      if (course.status !== "published") {
        return { success: false, code: "unavailable", message: "This course isn't available for purchase." };
      }

      const activeEnrollment = await EnrollmentRepository.findByStudentAndCourse(studentId, course.id);
      if (activeEnrollment?.status === "active") {
        return { success: false, code: "conflict", message: "You're already enrolled in this course." };
      }

      const existingOrder = await OrderRepository.findActiveByStudentAndCourse(studentId, course.id);
      if (existingOrder) {
        // A pending order is resumable — hand it back and let the
        // Payment Platform's CheckoutService open a fresh provider
        // session against it. (A `paid` one was already blocked above
        // unless its enrollment was revoked — treat that as complete.)
        return {
          success: true,
          data: { order: existingOrder, isFree: existingOrder.status === "paid" },
        };
      }

      let discountTotal = "0.00";
      let couponId: string | null = null;
      if (input.couponCode) {
        const couponResult = await CouponService.validateForCheckout(input.couponCode, course, studentId);
        if (!couponResult.success) return couponResult;
        discountTotal = couponResult.data.discountAmount;
        couponId = couponResult.data.coupon.id;
      }

      const pricing = PricingService.compute({
        unitPrice: course.price,
        discountAmount: discountTotal,
        currency: course.currency,
      });

      const order = await OrderRepository.create({
        studentId,
        status: pricing.isFree ? "paid" : "pending",
        subtotal: pricing.subtotal,
        discountTotal: pricing.discountTotal,
        taxTotal: pricing.taxTotal,
        total: pricing.total,
        currency: pricing.currency,
        couponId,
      });
      await OrderItemRepository.create({ orderId: order.id, courseId: course.id, unitPrice: course.price });
      await recordOrderAuditLog({ action: "order_created", orderId: order.id, actorType: "user", actorId: actingUser.id });

      if (pricing.isFree) {
        await completeOrder(order, actingUser.id, null, "user");
      }
      return { success: true, data: { order, isFree: pricing.isFree } };
    });
  },

  /**
   * The system completion path — called ONLY by the Payment Platform
   * after a webhook-verified (or provider-confirmed capture) payment:
   * no acting user, no permission check, because the authority here is
   * the verified payment itself, not a session. Idempotent the same way
   * `markPaid` is: an already-paid order is a no-op success, so a
   * replayed webhook can never double-enroll or double-redeem.
   */
  async completeFromVerifiedPayment(orderId: string, paymentId?: string | null): Promise<CommerceActionResult<Order>> {
    return safeMutation(async () => {
      const order = await OrderRepository.findById(orderId);
      if (!order) {
        return { success: false, code: "not_found", message: "Order not found." };
      }
      if (order.status === "paid") {
        return { success: true, data: order };
      }
      if (order.status !== "pending") {
        return { success: false, code: "conflict", message: `This order is ${order.status} and can't be completed.` };
      }

      const result = await OrderRepository.updateStatus(orderId, "paid", order.updatedAt);
      if (result.status !== "ok") {
        // Lost a race with a concurrent completion — re-read; if the
        // winner made it paid, this delivery has nothing left to do.
        const current = await OrderRepository.findById(orderId);
        if (current?.status === "paid") return { success: true, data: current };
        return { success: false, code: "conflict", message: "Order changed while completing." };
      }

      await completeOrder(result.data, null, paymentId ?? null);
      return { success: true, data: result.data };
    });
  },

  /** System counterpart of `refund` for the Payment Platform: once a
   *  provider confirms the FULL amount went back (sync response or
   *  webhook), the order flips to `refunded` with no session in scope.
   *  Idempotent; access revocation stays a separate deliberate admin
   *  decision, same as `refund` itself. */
  async markRefundedFromVerifiedRefund(orderId: string): Promise<CommerceActionResult<Order>> {
    return safeMutation(async () => {
      const order = await OrderRepository.findById(orderId);
      if (!order) {
        return { success: false, code: "not_found", message: "Order not found." };
      }
      if (order.status === "refunded") {
        return { success: true, data: order };
      }
      if (order.status !== "paid") {
        return { success: false, code: "conflict", message: `This order is ${order.status} and can't be refunded.` };
      }
      const result = await OrderRepository.updateStatus(orderId, "refunded", order.updatedAt);
      if (result.status !== "ok") {
        const current = await OrderRepository.findById(orderId);
        if (current?.status === "refunded") return { success: true, data: current };
        return { success: false, code: "conflict", message: "Order changed while refunding." };
      }
      await recordOrderAuditLog({ action: "order_refunded", orderId, actorId: null });
      return { success: true, data: result.data };
    });
  },

  /** The admin "Mark as Paid" override — for a payment genuinely
   *  received out-of-band (bank transfer, cash). Management-only now:
   *  with a real provider live, a student's own path to "paid" is
   *  exclusively the webhook-verified one
   *  (`completeFromVerifiedPayment`), never a self-serve action.
   *  Idempotent: an already-paid order is a no-op success. */
  async markPaid(actingUser: AuthUser, orderId: string): Promise<CommerceActionResult<Order>> {
    return safeMutation(async () => {
      const manager = await requireCommerceManagementAccess();
      if (!manager || manager.id !== actingUser.id) {
        return { success: false, code: "forbidden", message: "You cannot update this order." };
      }
      const order = await OrderRepository.findById(orderId);
      if (!order) {
        return { success: false, code: "not_found", message: "Order not found." };
      }
      if (order.status === "paid") {
        return { success: true, data: order };
      }
      if (order.status !== "pending") {
        return { success: false, code: "conflict", message: `This order is ${order.status} and can't be marked paid.` };
      }

      const result = await OrderRepository.updateStatus(orderId, "paid", order.updatedAt);
      if (result.status !== "ok") {
        return { success: false, code: "conflict", message: "This order was changed by someone else. Reload and try again." };
      }

      await completeOrder(result.data, actingUser.id, null, "admin");
      return { success: true, data: result.data };
    });
  },

  /** Admin-only — a student doesn't self-cancel today (no such
   *  requirement/UI exists yet); only a `pending` order can be
   *  cancelled. */
  async cancel(orderId: string, expectedUpdatedAt?: string): Promise<CommerceActionResult<Order>> {
    return safeMutation(async () => {
      const user = await requireCommerceManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage orders." };
      }
      const order = await OrderRepository.findById(orderId);
      if (!order) {
        return { success: false, code: "not_found", message: "Order not found." };
      }
      if (order.status !== "pending") {
        return { success: false, code: "conflict", message: `Only a pending order can be cancelled (this one is ${order.status}).` };
      }

      const result = await OrderRepository.updateStatus(orderId, "cancelled", expectedUpdatedAt ?? order.updatedAt);
      if (result.status !== "ok") {
        return { success: false, code: "conflict", message: "This order was changed by someone else. Reload and try again." };
      }
      await recordOrderAuditLog({ action: "order_cancelled", orderId, actorType: "admin", actorId: user.id });
      return { success: true, data: result.data };
    });
  },

  /** Admin-only — a refund never touches the enrollment it granted
   *  (matches docs/database-overview.md §3's `refunds` design intent:
   *  access revocation on refund is a separate, deliberate admin
   *  decision, not automatic). Only a `paid` order can be refunded. */
  async refund(orderId: string, expectedUpdatedAt?: string): Promise<CommerceActionResult<Order>> {
    return safeMutation(async () => {
      const user = await requireCommerceManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage orders." };
      }
      const order = await OrderRepository.findById(orderId);
      if (!order) {
        return { success: false, code: "not_found", message: "Order not found." };
      }
      if (order.status !== "paid") {
        return { success: false, code: "conflict", message: `Only a paid order can be refunded (this one is ${order.status}).` };
      }

      const result = await OrderRepository.updateStatus(orderId, "refunded", expectedUpdatedAt ?? order.updatedAt);
      if (result.status !== "ok") {
        return { success: false, code: "conflict", message: "This order was changed by someone else. Reload and try again." };
      }
      await recordOrderAuditLog({ action: "order_refunded", orderId, actorType: "admin", actorId: user.id });
      // An order-level admin refund reverses the whole sale's revenue
      // (money refunded through the Payment Platform reverses through
      // its own refund rows instead — this key keeps the two paths from
      // ever double-reversing).
      await RevenueEngine.reverseForRefund({
        orderId,
        reversalKey: `order-refund:${orderId}`,
        refundedAmount: order.total,
        paidAmount: order.total,
        actorId: user.id,
      });
      return { success: true, data: result.data };
    });
  },

  /**
   * The Instructor Earnings page (`/instructor/earnings`, Phase 6, Step
   * 6.6) — gross revenue collected (`paid` orders only) per one of the
   * signed-in Instructor's own courses, via
   * `OrderItemRepository.getRevenueByCourseIds`. Never another
   * Instructor's revenue — scoped the same "profile -> own `instructors`
   * row -> `courses` by `instructorId`" way `EnrollmentService
   * .listForInstructor` resolves its own course scope. No payout/revenue
   * -share number — see `InstructorEarningsSummary`'s doc comment for
   * why.
   */
  async getOwnEarningsSummary(actingUser: AuthUser, locale: Locale): Promise<InstructorEarningsSummary> {
    const empty: InstructorEarningsSummary = { courses: [], totalRevenue: "0.00", totalPaidOrders: 0 };
    if (!isRoleAllowed(actingUser.role, ["instructor"])) return empty;
    const ownInstructor = await CourseService.getOwnInstructor(actingUser);
    if (!ownInstructor) return empty;
    const ownCourses = await safeRead(() => CourseRepository.findByInstructorId(ownInstructor.id), []);
    if (ownCourses.length === 0) return empty;

    const revenueRows = await safeRead(
      () => OrderItemRepository.getRevenueByCourseIds(ownCourses.map((course) => course.id)),
      [],
    );
    const revenueByCourseId = new Map(revenueRows.map((row) => [row.courseId, row]));

    const courseEarnings = ownCourses
      .map((course) => {
        const revenue = revenueByCourseId.get(course.id);
        return {
          courseId: course.id,
          courseTitle: resolveLocalizedText(course.title, locale),
          currency: course.currency,
          totalRevenue: revenue?.totalRevenue ?? "0.00",
          paidOrderCount: revenue?.paidOrderCount ?? 0,
        };
      })
      .filter((entry) => entry.paidOrderCount > 0);

    const totalRevenue = courseEarnings
      .reduce((sum, entry) => sum + Number(entry.totalRevenue), 0)
      .toFixed(2);
    const totalPaidOrders = courseEarnings.reduce((sum, entry) => sum + entry.paidOrderCount, 0);

    return { courses: courseEarnings, totalRevenue, totalPaidOrders };
  },
};
