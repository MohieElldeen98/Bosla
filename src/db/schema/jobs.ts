import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const jobStatusEnum = pgEnum("job_status", ["pending", "processing", "completed", "failed"]);

/**
 * The durable, generic background-job queue (docs/media-platform.md
 * "Background processing") — replaces the old in-process `InlineJobQueue`,
 * which ran jobs via a bare `setImmediate` in the same request's process
 * and had no way to survive that process being torn down mid-job, the
 * normal lifecycle of a Vercel serverless function. This table IS the
 * durability: a job's state lives here, not in any function's memory, so
 * a job survives its executing function dying at any point.
 *
 * Deliberately not media-specific — `name`/`payload` are opaque to this
 * table (`src/jobs/types.ts`'s `QueueJob` union is what gives them
 * meaning), so any future job kind (email, report generation, storage
 * GC, ...) reuses this same table and claim/retry machinery instead of
 * growing its own queue.
 */
export const jobQueue = pgTable(
  "job_queue",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    /** A registered `QueueJob["name"]` (e.g. "media.process") — the
     *  worker's handler registry key, not a foreign key to anything. */
    name: text("name").notNull(),
    payload: jsonb("payload").notNull(),
    status: jobStatusEnum("status").notNull().default("pending"),
    /** Incremented on every claim (not every failure) — a job stuck
     *  `processing` past `lockedAt`'s staleness window and reclaimed
     *  counts as a real attempt too, since something about running it
     *  didn't finish cleanly. */
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    /** Claim eligibility gate — `now()` for a fresh job, pushed forward
     *  on retry for exponential backoff. Never used to *expire* a job. */
    runAt: timestamp("run_at", { withTimezone: true }).notNull().default(sql`now()`),
    /** Set when claimed, cleared when the run finishes (success or a
     *  real failure). A `processing` row whose `lockedAt` is older than
     *  the worker's staleness window is presumed to belong to a function
     *  that died mid-run and gets reclaimed — see `src/jobs/repository.ts`. */
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    // The claim query's own access pattern: "due pending work, oldest
    // first" — this index is what keeps that a cheap index scan instead
    // of a sequential scan as the table grows.
    index("job_queue_claim_idx").on(table.status, table.runAt),
  ],
);
