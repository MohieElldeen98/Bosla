import { z } from "zod";
import { logger } from "@/lib/logger";

const supabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
});

export type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;
export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;

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
