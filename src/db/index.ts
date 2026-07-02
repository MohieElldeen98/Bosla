import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { dbEnv } from "@/lib/env";
import * as schema from "./schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

let instance: Database | null = null;

/**
 * Lazily constructs the Postgres connection on first use rather than at
 * import time — mirrors the fail-gracefully pattern in `lib/supabase/*`: if
 * `DATABASE_URL` is missing/invalid, the failure surfaces only when a query
 * actually runs (inside `ProfileRepository`'s own try/catch), never as a
 * crash the moment this module is imported (which would take down every
 * page, since `ProfileRepository` is on the sign-up/sign-in path).
 *
 * `prepare: false` disables prepared statements — required when the
 * connection string points at Supabase's transaction-mode pooler
 * (pgbouncer), which doesn't support them. Harmless against a direct
 * connection too.
 */
export function getDb(): Database {
  if (!instance) {
    const client = postgres(dbEnv?.DATABASE_URL ?? "", { max: 1, prepare: false });
    instance = drizzle(client, { schema });
  }
  return instance;
}
