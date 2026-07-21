import { NextResponse } from "next/server";
import { PaymentExpiryService } from "@/payments/checkout/payment-expiry.service";
import { paymentsLogger } from "@/payments/utils/payments-logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * `GET /api/payments/cron/sweep-expired` — the OPTIONAL scheduled
 * counterpart to the lazy expiry sweep (docs/payment-platform.md
 * §Expiration). The platform is already correct without this route:
 * every student-facing status poll and the admin Payments listing
 * sweep the order(s) they're about to show. This exists purely so a
 * truly abandoned order — nobody ever checks its status again, no admin
 * ever opens the listing — still eventually reads `expired` instead of
 * `pending` forever, for reporting cleanliness. Wire it to any scheduler
 * (Vercel Cron, a GitHub Actions schedule, …) at whatever interval is
 * convenient (hourly is plenty; nothing financial depends on this
 * running promptly, or at all).
 *
 * Gated by `CRON_SECRET` (`Authorization: Bearer <secret>`) — fails
 * closed (404, not 401, to avoid confirming the route exists) if the
 * env var isn't configured, since an unauthenticated sweep endpoint
 * would otherwise be free reconnaissance into how many payments are
 * pending.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const swept = await PaymentExpiryService.sweep();
  paymentsLogger.info("payment.expiry_cron_swept", { swept });
  return NextResponse.json({ swept });
}
