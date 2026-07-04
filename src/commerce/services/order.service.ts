import { OrderRepository } from "@/commerce/repositories/order.repository";
import { OrderItemRepository } from "@/commerce/repositories/order-item.repository";
import { PaymentIntentRepository } from "@/commerce/repositories/payment-intent.repository";
import { PaymentService } from "@/commerce/services/payment.service";
import { CouponService } from "@/commerce/services/coupon.service";
import { CouponRepository } from "@/commerce/repositories/coupon.repository";
import { CourseRepository } from "@/courses/repositories/course.repository";
import { CourseService } from "@/courses/services/course.service";
import { EnrollmentRepository } from "@/learning/repositories/enrollment.repository";
import { ProfileService } from "@/auth/services/profile.service";
import { canAccessStudentData } from "@/commerce/utils/require-student-access";
import { requireCommerceManagementAccess } from "@/commerce/utils/require-commerce-access";
import { recordOrderAuditLog } from "@/commerce/utils/audit-log";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { safeMutation, safeRead } from "@/commerce/utils/safe-operation";
import { notify } from "@/notifications/utils/notify";
import { buildNotificationContent } from "@/notifications/utils/notification-content";
import type { Locale } from "@/i18n/routing";
import type { AuthUser } from "@/auth/types/session";
import type { Enrollment } from "@/learning/types/enrollment";
import type { Order } from "@/commerce/types/order";
import type { PaymentIntent } from "@/commerce/types/payment-intent";
import type { OrderListItem, OrderSearchFilters, OrderSearchResult } from "@/commerce/types/order-search";
import type { InstructorEarningsSummary } from "@/commerce/types/instructor-earnings";
import type { CommerceActionResult } from "@/commerce/types/result";
import type { CreateCheckoutInput } from "@/commerce/validators/order.validator";

export interface CheckoutResult {
  order: Order;
  paymentIntent: PaymentIntent | null;
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
async function completeOrder(order: Order, actorId: string | null): Promise<void> {
  const items = await OrderItemRepository.findByOrderId(order.id);
  const enrollments = await Promise.all(
    items.map((item) => grantEnrollmentForOrder(order.studentId, item.courseId)),
  );

  if (order.couponId) {
    await CouponRepository.incrementRedeemedCount(order.couponId);
  }

  await recordOrderAuditLog({ action: "order_paid", orderId: order.id, actorId });
  await notifyOrderCompleted(order, items, enrollments);
}

async function resolveOrders(rows: Order[], locale: Locale): Promise<OrderListItem[]> {
  if (rows.length === 0) return [];

  const orderIds = rows.map((o) => o.id);
  const [items, profiles, intents, coupons] = await Promise.all([
    safeRead(() => OrderItemRepository.findByOrderIds(orderIds), []),
    ProfileService.getByUserIds([...new Set(rows.map((o) => o.studentId))]),
    safeRead(() => PaymentIntentRepository.findByOrderIds(orderIds), []),
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

  const latestIntentByOrderId = new Map<string, PaymentIntent>();
  for (const intent of intents) {
    if (!latestIntentByOrderId.has(intent.orderId)) {
      latestIntentByOrderId.set(intent.orderId, intent);
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
      total: order.total,
      currency: order.currency,
      couponCode: coupon?.code ?? null,
      latestPaymentStatus: latestIntentByOrderId.get(order.id)?.status ?? null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  });
}

/**
 * Orchestration for `orders`/`order_items` — the Commerce Domain's
 * checkout entry point. `createFromCheckout` is where duplicate-purchase
 * prevention, course-availability validation, and coupon locking all
 * happen; `markPaid` is the single "this order is now paid" completion
 * path, reachable both by a student's own "simulate successful payment"
 * click and an admin's "Mark as Paid" override (`canAccessStudentData`
 * allows both, same convention `LessonProgressService`/
 * `CoursePlayerService` already established). `cancel`/`refund` are
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
   * to $0) completes immediately, no `PaymentIntent` needed at all —
   * there's nothing to pay, so nothing to simulate.
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
        const latestIntent = await PaymentService.getLatestForOrder(existingOrder.id);
        // A pending intent is still payable — hand back the same one
        // rather than creating a redundant second attempt. A failed/
        // canceled intent isn't payable anymore, so a resumed checkout
        // needs a fresh one to actually retry against.
        const intent =
          latestIntent && latestIntent.status !== "pending"
            ? await PaymentService.createIntent(existingOrder.id, existingOrder.total, existingOrder.currency)
            : latestIntent;
        return { success: true, data: { order: existingOrder, paymentIntent: intent } };
      }

      let discountTotal = "0.00";
      let couponId: string | null = null;
      if (input.couponCode) {
        const couponResult = await CouponService.validateForCheckout(input.couponCode, course);
        if (!couponResult.success) return couponResult;
        discountTotal = couponResult.data.discountAmount;
        couponId = couponResult.data.coupon.id;
      }

      const subtotal = course.price;
      const total = Math.max(0, Number(subtotal) - Number(discountTotal)).toFixed(2);
      const isFree = Number(total) === 0;

      const order = await OrderRepository.create({
        studentId,
        status: isFree ? "paid" : "pending",
        subtotal,
        discountTotal,
        total,
        currency: course.currency,
        couponId,
      });
      await OrderItemRepository.create({ orderId: order.id, courseId: course.id, unitPrice: course.price });
      await recordOrderAuditLog({ action: "order_created", orderId: order.id, actorId: actingUser.id });

      if (isFree) {
        await completeOrder(order, actingUser.id);
        return { success: true, data: { order, paymentIntent: null } };
      }

      const paymentIntent = await PaymentService.createIntent(order.id, total, course.currency);
      return { success: true, data: { order, paymentIntent } };
    });
  },

  /** The single "this order is now paid" path — see this service's own
   *  doc comment. Idempotent: calling it on an already-paid order is a
   *  no-op success, never a duplicate enrollment/redemption. */
  async markPaid(actingUser: AuthUser, orderId: string): Promise<CommerceActionResult<Order>> {
    return safeMutation(async () => {
      const order = await OrderRepository.findById(orderId);
      if (!order) {
        return { success: false, code: "not_found", message: "Order not found." };
      }
      if (!canAccessStudentData(actingUser, order.studentId)) {
        return { success: false, code: "forbidden", message: "You cannot update this order." };
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

      await completeOrder(result.data, actingUser.id);
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
      await recordOrderAuditLog({ action: "order_cancelled", orderId, actorId: user.id });
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
      await recordOrderAuditLog({ action: "order_refunded", orderId, actorId: user.id });
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
