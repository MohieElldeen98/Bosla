/** Wire shapes for the slices of Paymob's API this adapter touches —
 *  internal to `src/payments/providers/paymob/`, never imported outside
 *  it. Fields are optional/loose on purpose: Paymob payloads vary by
 *  payment method, and anything absent must degrade to "unverifiable,"
 *  not a crash. */

export interface PaymobIntentionResponse {
  id?: string | number;
  client_secret?: string;
  [key: string]: unknown;
}

export interface PaymobAuthTokenResponse {
  token?: string;
  [key: string]: unknown;
}

/** The `obj` of a `{"type": "TRANSACTION", "obj": {...}}` webhook
 *  delivery (and the shape transaction endpoints return). */
export interface PaymobTransaction {
  id?: number;
  amount_cents?: number;
  created_at?: string;
  currency?: string;
  error_occured?: boolean;
  has_parent_transaction?: boolean;
  integration_id?: number;
  is_3d_secure?: boolean;
  is_auth?: boolean;
  is_capture?: boolean;
  is_refunded?: boolean;
  is_standalone_payment?: boolean;
  is_voided?: boolean;
  owner?: number;
  pending?: boolean;
  success?: boolean;
  order?: {
    id?: number;
    merchant_order_id?: string | null;
    [key: string]: unknown;
  };
  source_data?: {
    pan?: string;
    sub_type?: string;
    type?: string;
    [key: string]: unknown;
  };
  payment_key_claims?: {
    extra?: Record<string, unknown>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface PaymobWebhookBody {
  type?: string;
  obj?: PaymobTransaction;
  [key: string]: unknown;
}
