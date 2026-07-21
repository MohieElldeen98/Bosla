import { z } from "zod";
import { logger } from "@/lib/logger";

const supabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
});

const mediaStorageEnvSchema = z.object({
  MEDIA_STORAGE_PROVIDER: z.enum(["r2", "s3"]),
  MEDIA_STORAGE_BUCKET: z.string().min(1),
  MEDIA_STORAGE_REGION: z.string().min(1),
  MEDIA_STORAGE_ENDPOINT: z.string().url().optional(),
  MEDIA_STORAGE_ACCESS_KEY_ID: z.string().min(1),
  MEDIA_STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
  /** Optional CDN/public-bucket base for `visibility: "public"` assets
   *  (e.g. an R2 custom domain). Without it, public assets serve through
   *  the authorizing `/api/media` redirect route instead. */
  MEDIA_PUBLIC_BASE_URL: z.string().url().optional(),
});

const paymentPlatformEnvSchema = z.object({
  /** Which `PaymentProviderAdapter` handles checkout — a free string,
   *  not an enum: adding a provider is a registry entry in
   *  `src/payments/providers/`, never a schema/env-contract change. */
  PAYMENT_PROVIDER: z.string().min(1),
  /** Flat tax rate the pricing engine applies to (subtotal − discount).
   *  Defaults to 0 — Bosla's launch market (Egypt) collects none on
   *  course sales today; a future per-country tax table replaces this
   *  one knob without touching business logic (docs/payment-platform.md). */
  PAYMENT_TAX_RATE_PERCENT: z.coerce.number().min(0).max(100).default(0),
});

const paymobEnvSchema = z.object({
  PAYMOB_SECRET_KEY: z.string().min(1),
  PAYMOB_PUBLIC_KEY: z.string().min(1),
  PAYMOB_HMAC_SECRET: z.string().min(1),
  /** Comma-separated Paymob integration ids (card, wallet, …) offered at
   *  checkout — from the Paymob dashboard, Developers → Payment
   *  Integrations. */
  PAYMOB_INTEGRATION_IDS: z.string().min(1),
  /** The legacy "API Key" (dashboard → Settings → Account Info) — only
   *  needed for post-payment operations (refund/capture/void/retrieve),
   *  which still ride Paymob's token-auth Acceptance API. Checkout works
   *  without it. */
  PAYMOB_API_KEY: z.string().min(1).optional(),
  PAYMOB_API_BASE: z.string().url().default("https://accept.paymob.com"),
});

const paymentEmailEnvSchema = z.object({
  RESEND_API_KEY: z.string().min(1),
  /** e.g. "Bosla <receipts@bosla.app>" — must be a verified Resend
   *  sender/domain. */
  PAYMENT_EMAIL_FROM: z.string().min(3),
});

export type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;
export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
export type MediaStorageEnv = z.infer<typeof mediaStorageEnvSchema>;
export type PaymentPlatformEnv = z.infer<typeof paymentPlatformEnvSchema>;
export type PaymobEnv = z.infer<typeof paymobEnvSchema>;
export type PaymentEmailEnv = z.infer<typeof paymentEmailEnvSchema>;

function loadSupabaseEnv(): SupabaseEnv | null {
  const result = supabaseEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!result.success) {
    logger.warn(
      "[env] Missing or invalid Supabase environment variables — see .env.example. " +
        "Auth will behave as signed-out (fail-closed) until these are set:",
      result.error.flatten().fieldErrors,
    );
    return null;
  }

  return result.data;
}

function loadDatabaseEnv(): DatabaseEnv | null {
  const result = databaseEnvSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
  });

  if (!result.success) {
    // Server-only var with no NEXT_PUBLIC_ prefix — in the browser bundle
    // it is absent by design, so warning there would flag every healthy
    // deployment. Only the server knowing it's missing means something.
    if (typeof window !== "undefined") return null;
    logger.warn(
      "[env] Missing or invalid DATABASE_URL — see .env.example. " +
        "Profile reads/writes will fail closed (return null/empty) until this is set:",
      result.error.flatten().fieldErrors,
    );
    return null;
  }

  return result.data;
}

function loadMediaStorageEnv(): MediaStorageEnv | null {
  // MEDIA_STORAGE_* is the canonical name; VIDEO_STORAGE_* is accepted as
  // a per-variable fallback because the video system shipped first under
  // that name and existing deployments already carry it.
  const result = mediaStorageEnvSchema.safeParse({
    MEDIA_STORAGE_PROVIDER: process.env.MEDIA_STORAGE_PROVIDER || process.env.VIDEO_STORAGE_PROVIDER,
    MEDIA_STORAGE_BUCKET: process.env.MEDIA_STORAGE_BUCKET || process.env.VIDEO_STORAGE_BUCKET,
    MEDIA_STORAGE_REGION: process.env.MEDIA_STORAGE_REGION || process.env.VIDEO_STORAGE_REGION,
    MEDIA_STORAGE_ENDPOINT:
      process.env.MEDIA_STORAGE_ENDPOINT || process.env.VIDEO_STORAGE_ENDPOINT || undefined,
    MEDIA_STORAGE_ACCESS_KEY_ID:
      process.env.MEDIA_STORAGE_ACCESS_KEY_ID || process.env.VIDEO_STORAGE_ACCESS_KEY_ID,
    MEDIA_STORAGE_SECRET_ACCESS_KEY:
      process.env.MEDIA_STORAGE_SECRET_ACCESS_KEY || process.env.VIDEO_STORAGE_SECRET_ACCESS_KEY,
    MEDIA_PUBLIC_BASE_URL: process.env.MEDIA_PUBLIC_BASE_URL || undefined,
  });

  if (!result.success) {
    // Server-only credentials, absent in the browser bundle by design —
    // same reasoning as DATABASE_URL above. When genuinely unset on the
    // server, uploads/streaming disable themselves with clear UI
    // placeholders rather than crashing (docs/media-platform.md).
    if (typeof window !== "undefined") return null;
    if (process.env.MEDIA_STORAGE_PROVIDER || process.env.VIDEO_STORAGE_PROVIDER) {
      logger.warn(
        "[env] MEDIA_STORAGE_* is partially configured — see .env.example. " +
          "Media upload/streaming stays disabled until all required vars are set:",
        result.error.flatten().fieldErrors,
      );
    }
    return null;
  }

  return result.data;
}

function loadPaymentPlatformEnv(): PaymentPlatformEnv | null {
  const result = paymentPlatformEnvSchema.safeParse({
    PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER,
    PAYMENT_TAX_RATE_PERCENT: process.env.PAYMENT_TAX_RATE_PERCENT || undefined,
  });
  if (!result.success) {
    // Server-only, absent in the browser bundle by design — same
    // reasoning as DATABASE_URL above. Unset means "online payments are
    // not configured": checkout degrades to free-courses-only with a
    // clear message, never a crash (src/payments/providers/index.ts).
    return null;
  }
  return result.data;
}

function loadPaymobEnv(): PaymobEnv | null {
  const result = paymobEnvSchema.safeParse({
    PAYMOB_SECRET_KEY: process.env.PAYMOB_SECRET_KEY,
    PAYMOB_PUBLIC_KEY: process.env.PAYMOB_PUBLIC_KEY,
    PAYMOB_HMAC_SECRET: process.env.PAYMOB_HMAC_SECRET,
    PAYMOB_INTEGRATION_IDS: process.env.PAYMOB_INTEGRATION_IDS,
    PAYMOB_API_KEY: process.env.PAYMOB_API_KEY || undefined,
    PAYMOB_API_BASE: process.env.PAYMOB_API_BASE || undefined,
  });
  if (!result.success) {
    if (typeof window !== "undefined") return null;
    if (process.env.PAYMOB_SECRET_KEY || process.env.PAYMOB_PUBLIC_KEY || process.env.PAYMOB_HMAC_SECRET) {
      logger.warn(
        "[env] PAYMOB_* is partially configured — see .env.example. " +
          "The Paymob provider stays disabled until all required vars are set:",
        result.error.flatten().fieldErrors,
      );
    }
    return null;
  }
  return result.data;
}

function loadPaymentEmailEnv(): PaymentEmailEnv | null {
  const result = paymentEmailEnvSchema.safeParse({
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    PAYMENT_EMAIL_FROM: process.env.PAYMENT_EMAIL_FROM,
  });
  if (!result.success) {
    // Optional concern: without it, transactional payment emails are
    // skipped (in-app notifications still fire) — never an error.
    return null;
  }
  return result.data;
}

/**
 * `null` when Supabase env vars are missing/invalid. Every Supabase client
 * factory (`lib/supabase/*`, `lib/auth/middleware-client.ts`) still attempts
 * construction regardless — that's what produces the specific Supabase SDK
 * error — but every caller that reads session state (`AuthRepository`,
 * `middleware/session.ts`) wraps that in try/catch and fails closed to "no
 * session" rather than crashing. See docs/authentication-architecture.md.
 */
export const env = loadSupabaseEnv();

/**
 * Independent from `env` above on purpose — a deployment can have valid
 * Supabase Auth credentials before `DATABASE_URL` is configured (or vice
 * versa); one missing var must not take down the other concern. `null`
 * when missing/invalid; `src/db/index.ts` degrades the same way the
 * Supabase clients do — see `getDb()`.
 */
export const dbEnv = loadDatabaseEnv();

/**
 * `null` when the media object-store credentials are missing — the third
 * independent concern, same isolation rationale as `dbEnv`: a deployment
 * without R2/S3 credentials still builds, boots, and serves everything
 * except media upload/streaming, which reports itself unconfigured
 * (`src/media/storage/index.ts` → `getMediaStorage()`).
 */
export const mediaStorageEnv = loadMediaStorageEnv();

/**
 * The Payment Platform's own concern trio (docs/payment-platform.md),
 * isolated from each other the same way `dbEnv`/`mediaStorageEnv` are:
 * `paymentEnv` selects the active provider (null → online payments
 * disabled, free enrollment still works), `paymobEnv` carries the
 * Paymob adapter's credentials, `paymentEmailEnv` the optional
 * transactional-email sender.
 */
export const paymentEnv = loadPaymentPlatformEnv();
export const paymobEnv = loadPaymobEnv();
export const paymentEmailEnv = loadPaymentEmailEnv();
