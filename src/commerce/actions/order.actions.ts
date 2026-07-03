"use server";

import { OrderService } from "@/commerce/services/order.service";
import { SessionService } from "@/auth/services/session.service";
import type { Locale } from "@/i18n/routing";
import type { Order } from "@/commerce/types/order";
import type { OrderListItem } from "@/commerce/types/order-search";
import type { CommerceActionResult } from "@/commerce/types/result";

/** The Student Dashboard's Orders & Billing page — always the caller's
 *  own orders, same reasoning `getMyDashboardAction` never accepts a
 *  caller-supplied student id. */
export async function listMyOrdersAction(locale: Locale): Promise<CommerceActionResult<OrderListItem[]>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  return OrderService.listForStudent(actingUser, actingUser.id, locale);
}

/** One order's detail — reused by both a student viewing their own
 *  order and an admin viewing any order; `OrderService.getResolvedById`
 *  does the actual self-or-admin check. */
export async function getOrderDetailAction(id: string, locale: Locale): Promise<CommerceActionResult<OrderListItem>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  return OrderService.getResolvedById(actingUser, id, locale);
}

/** The admin Orders listing's "Mark as Paid" row action — also reachable
 *  by a student's own checkout flow indirectly via `simulatePaymentSuccessAction`,
 *  but this direct action exists for the admin override case (e.g.
 *  payment received out-of-band). */
export async function markOrderPaidAction(id: string): Promise<CommerceActionResult<Order>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  return OrderService.markPaid(actingUser, id);
}

export async function cancelOrderAction(id: string, expectedUpdatedAt?: string): Promise<CommerceActionResult<Order>> {
  return OrderService.cancel(id, expectedUpdatedAt);
}

export async function refundOrderAction(id: string, expectedUpdatedAt?: string): Promise<CommerceActionResult<Order>> {
  return OrderService.refund(id, expectedUpdatedAt);
}
