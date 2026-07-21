import type { PaymobEnv } from "@/lib/env";
import type {
  PaymobAuthTokenResponse,
  PaymobIntentionResponse,
  PaymobTransaction,
} from "@/payments/providers/paymob/paymob-types";

/** Thrown for any non-2xx Paymob response — carries the HTTP status and
 *  the (truncated) body so the caller can log a diagnosable
 *  `provider_error` without ever exposing it to the student. */
export class PaymobApiError extends Error {
  constructor(
    readonly endpoint: string,
    readonly status: number,
    body: string,
  ) {
    super(`Paymob ${endpoint} responded ${status}: ${body.slice(0, 500)}`);
    this.name = "PaymobApiError";
  }
}

/**
 * The raw HTTP surface of Paymob's API — endpoints, auth schemes, and
 * JSON shapes live here and nowhere else. Two auth schemes because
 * Paymob has two API generations: the Intention API (hosted unified
 * checkout) authenticates with the account's Secret Key directly, while
 * post-payment operations (refund/capture/void/inquiry) still ride the
 * legacy Acceptance API, which needs a short-lived token minted from
 * the account's API Key.
 */
export class PaymobClient {
  constructor(private readonly env: PaymobEnv) {}

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${this.env.PAYMOB_API_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
      cache: "no-store",
    });
    const text = await response.text();
    if (!response.ok) {
      throw new PaymobApiError(path, response.status, text);
    }
    return (text ? JSON.parse(text) : {}) as T;
  }

  async createIntention(body: Record<string, unknown>): Promise<PaymobIntentionResponse> {
    return this.request<PaymobIntentionResponse>("/v1/intention/", {
      method: "POST",
      headers: { Authorization: `Token ${this.env.PAYMOB_SECRET_KEY}` },
      body: JSON.stringify(body),
    });
  }

  unifiedCheckoutUrl(clientSecret: string): string {
    const url = new URL("/unifiedcheckout/", this.env.PAYMOB_API_BASE);
    url.searchParams.set("publicKey", this.env.PAYMOB_PUBLIC_KEY);
    url.searchParams.set("clientSecret", clientSecret);
    return url.toString();
  }

  /** Legacy-API bearer token — required by refund/capture/void/
   *  inquiry. Minted per call (Paymob tokens are short-lived and these
   *  operations are rare admin actions; caching one here buys nothing
   *  but staleness bugs). */
  private async authToken(): Promise<string> {
    if (!this.env.PAYMOB_API_KEY) {
      throw new Error(
        "PAYMOB_API_KEY is not configured — refund/capture/void require it (see .env.example).",
      );
    }
    const result = await this.request<PaymobAuthTokenResponse>("/api/auth/tokens", {
      method: "POST",
      body: JSON.stringify({ api_key: this.env.PAYMOB_API_KEY }),
    });
    if (!result.token) {
      throw new Error("Paymob /api/auth/tokens returned no token.");
    }
    return result.token;
  }

  async refund(transactionId: string, amountCents: number): Promise<PaymobTransaction> {
    const token = await this.authToken();
    return this.request<PaymobTransaction>("/api/acceptance/void_refund/refund", {
      method: "POST",
      body: JSON.stringify({ auth_token: token, transaction_id: transactionId, amount_cents: amountCents }),
    });
  }

  async capture(transactionId: string, amountCents: number): Promise<PaymobTransaction> {
    const token = await this.authToken();
    return this.request<PaymobTransaction>("/api/acceptance/capture", {
      method: "POST",
      body: JSON.stringify({ auth_token: token, transaction_id: transactionId, amount_cents: amountCents }),
    });
  }

  async void(transactionId: string): Promise<PaymobTransaction> {
    const token = await this.authToken();
    return this.request<PaymobTransaction>("/api/acceptance/void_refund/void", {
      method: "POST",
      body: JSON.stringify({ auth_token: token, transaction_id: transactionId }),
    });
  }

  async retrieveTransaction(transactionId: string): Promise<PaymobTransaction> {
    const token = await this.authToken();
    return this.request<PaymobTransaction>(`/api/acceptance/transactions/${encodeURIComponent(transactionId)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
