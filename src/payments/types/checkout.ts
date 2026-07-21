import type { Order } from "@/commerce/types/order";

/** What `startCheckoutAction` hands the checkout UI. Exactly one of the
 *  three shapes:
 *  - `completed` — a $0 order (free course / fully-discounted): access
 *    is already granted, nothing to pay.
 *  - `redirect` — a real payment: the browser goes to `redirectUrl`
 *    (the provider's hosted checkout) and comes back to the result
 *    page, which polls the server for the verified outcome.
 *  - `unavailable` — no payment provider is configured; paid checkout
 *    is off. */
export type CheckoutStart =
  | { kind: "completed"; order: Order }
  | { kind: "redirect"; order: Order; paymentId: string; redirectUrl: string }
  | { kind: "unavailable"; message: string };

/** What the checkout result page polls for — derived purely from
 *  server-side DB state (the webhook-verified payment + order), never
 *  from anything the provider redirect claims. */
export interface CheckoutStatus {
  orderId: string;
  orderStatus: string;
  /** Normalized outcome for the UI: `paid` once the order is completed
   *  server-side, `failed` when the latest payment attempt failed/was
   *  voided, `pending` while verification is still in flight. */
  outcome: "paid" | "failed" | "pending";
  courseSlug: string | null;
}
