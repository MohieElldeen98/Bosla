import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { dbEnv } from "@/lib/env";
import * as schema from "./schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

/** Either the top-level `Database` or the `tx` handle inside
 *  `getDb().transaction(async (tx) => ...)` — both support the same query
 *  builder methods, so a repository method that needs to participate in a
 *  caller's transaction (e.g. an audit-log insert that must commit/rollback
 *  atomically with the write it's auditing) can accept either without a
 *  separate transaction-only overload. */
export type DbClient = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

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
