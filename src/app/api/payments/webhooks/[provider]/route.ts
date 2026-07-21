import { NextResponse } from "next/server";
import { WebhookService } from "@/payments/webhooks/webhook.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * `POST /api/payments/webhooks/[provider]` — the one webhook door for
 * every payment provider (Paymob today: this is the URL configured as
 * its "Transaction processed callback"). The raw body is read before
 * anything else — signatures verify bytes, not parsed JSON — and the
 * whole security pipeline (verification, replay protection,
 * idempotency, the immutable event log) lives in `WebhookService`.
 *
 * Status codes are the retry contract: 2xx acknowledges (including
 * events we deliberately ignore — redelivering them changes nothing),
 * 401 rejects a bad signature, 5xx asks the provider to redeliver.
 */
export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const rawBody = await request.text();

  const outcome = await WebhookService.process(provider, {
    rawBody,
    url: request.url,
    headers: request.headers,
  });

  switch (outcome.result) {
    case "processed":
    case "duplicate":
      return NextResponse.json({ received: true });
    case "ignored":
      return NextResponse.json({ received: true, ignored: outcome.reason });
    case "rejected":
      return NextResponse.json({ error: outcome.reason }, { status: 401 });
    case "retry":
      return NextResponse.json({ error: outcome.reason }, { status: 500 });
  }
}
