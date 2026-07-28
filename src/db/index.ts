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
 * `prepare: false` disables prepared statements. The connection string
 * actually points at Supabase's Session Pooler (port 5432), not the
 * transaction-mode pooler this comment previously assumed — harmless
 * either way, so left disabled rather than revisited here.
 *
 * `max: 2` (raised from the original 1 after a measured benchmark, not a
 * guess): at `max: 1`, every concurrent query — even the two a single
 * `/courses` request awaits via `Promise.all` — serializes on one FIFO
 * connection, which alone doubled that page's load time with zero
 * external traffic, and compounded further under real concurrency
 * (measured: 5 simultaneous `/courses` requests took 8.5–15.6s at
 * `max: 1` vs 4.2–7.6s at `max: 2`; LCP 12.1s vs 4.3s). Because pooling
 * is session-mode (not transaction-mode), each connection here holds a
 * dedicated backend connection for its whole lifetime, and this runs on
 * Vercel serverless where every instance gets its own pool — so `max` is
 * a real cost against Supabase's connection ceiling (60 total, ~51
 * realistically available under current load), not a value to raise
 * casually. 2 was chosen as the smallest increase that already captures
 * most of the measured win; higher values are untested.
 */
export function getDb(): Database {
  if (!globalForDb.__db) {
    const client = postgres(dbEnv?.DATABASE_URL ?? "", { max: 2, prepare: false });
    globalForDb.__db = drizzle(client, { schema });
  }
  return globalForDb.__db;
}
