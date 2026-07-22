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

/** Stashed on `globalThis`, not a plain module-level `let` — in Next.js
 *  dev mode, Fast Refresh re-evaluates server modules on practically
 *  every save, which reset a module-scoped singleton to `null` and made
 *  `getDb()` open a brand new Postgres connection each time without ever
 *  closing the previous one (nothing here ever calls `client.end()`).
 *  Those orphaned connections don't count against this process alone —
 *  they sit open against Supabase's session-mode pooler until it
 *  eventually reclaims them, and a long dev session can rack up enough of
 *  them to hit the pooler's hard cap ("max clients reached in session
 *  mode"), breaking every query until the dev server is restarted.
 *  `globalThis` survives module re-evaluation across Fast Refresh, so the
 *  same connection is reused for the lifetime of the Node process instead
 *  of leaking a new one per hot-reload — the standard fix for this exact
 *  class of dev-mode connection leak (same pattern Prisma's own docs
 *  recommend for `globalThis.prisma`). */
const globalForDb = globalThis as unknown as { __db?: Database };

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
  if (!globalForDb.__db) {
    const client = postgres(dbEnv?.DATABASE_URL ?? "", { max: 1, prepare: false });
    globalForDb.__db = drizzle(client, { schema });
  }
  return globalForDb.__db;
}
