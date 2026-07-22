import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { jobQueue } from "@/db/schema/jobs";
import type { JobListItem, JobStatus, QueueJob } from "@/jobs/types";

export interface JobRow {
  id: string;
  name: string;
  payload: unknown;
  attempts: number;
  maxAttempts: number;
}

/** `/admin/jobs`'s own recency window — how far back a query looks
 *  before capping results, not a retention/cleanup policy (nothing here
 *  ever deletes a `completed` row on a schedule; `remove` is the admin's
 *  own explicit action on a `failed` row). Plenty for an operational
 *  debugging view; anything older belongs in a direct DB query, not this
 *  page. */
const LIST_LIMIT = 100;

/** A `processing` row whose `lockedAt` is older than this is presumed to
 *  belong to a function invocation that died mid-run (a Vercel function
 *  hit its max duration, crashed, or was otherwise torn down) — long
 *  enough for the slowest real job in this app (a full video transcode)
 *  to finish under normal conditions, short enough that a genuinely
 *  stuck job doesn't sit invisible for hours. */
const STALE_LOCK_MINUTES = 15;

/** Exponential backoff for a retried job: 30s, 60s, 120s, 240s, ...,
 *  capped at 1 hour — `attempts` is the count *after* the failed run
 *  that's being scheduled for retry. */
function backoffSeconds(attempts: number): number {
  return Math.min(30 * 2 ** Math.max(0, attempts - 1), 3600);
}

/**
 * Data access for `job_queue` — every operation here is either a single
 * atomic statement or explicitly documented as best-effort, because this
 * runs under the app's shared `max: 1` Postgres connection
 * (`src/db/index.ts`'s own doc comment): nothing here may hold a
 * transaction open across the actual job execution (a slow transcode
 * would then block every other query in the app for its entire
 * duration) — claim, then release, then execute, then a separate short
 * write to record the outcome.
 */
export const JobRepository = {
  async insert(job: QueueJob): Promise<string> {
    const [row] = await getDb()
      .insert(jobQueue)
      .values({ name: job.name, payload: job.payload })
      .returning({ id: jobQueue.id });
    return row.id;
  },

  /** Resets any `processing` row stuck past `STALE_LOCK_MINUTES` back
   *  through the same retry-or-fail decision a normal execution failure
   *  goes through (a reclaim IS a failed attempt — something about that
   *  run didn't finish cleanly, so it counts against `maxAttempts` the
   *  same way). Called at the start of every worker pass, both the
   *  immediate post-enqueue trigger and the cron sweep — this one query
   *  is the actual "survives function termination" guarantee; everything
   *  else here is throughput/ordering. Returns how many rows it touched,
   *  for logging. */
  async reclaimStale(): Promise<number> {
    const message = `Reclaimed: still processing after ${STALE_LOCK_MINUTES} minutes — presumed crashed.`;
    const result = await getDb().execute(sql`
      UPDATE job_queue
      SET
        status = (CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'pending' END)::job_status,
        run_at = CASE WHEN attempts >= max_attempts THEN run_at ELSE now() END,
        locked_at = NULL,
        last_error = ${message},
        updated_at = now()
      WHERE status = 'processing'
        AND locked_at < now() - (${STALE_LOCK_MINUTES}::text || ' minutes')::interval
    `);
    return result.count ?? 0;
  },

  /**
   * Claims up to `limit` due jobs, atomically. `FOR UPDATE SKIP LOCKED`
   * is what makes concurrent claimers (several `after()` triggers firing
   * from a burst of uploads, plus a cron sweep landing at the same
   * moment) safe with no coordination between them — each claimer just
   * gets whatever rows the others haven't already locked, never the
   * same row twice.
   *
   * The concurrency cap is soft, not linearizable: the "how many are
   * already processing" count is read in the same statement as the
   * claim, but two concurrent claimers under Postgres's default READ
   * COMMITTED isolation can each see the same pre-claim count and both
   * proceed, briefly exceeding `maxConcurrent` by a small amount in a
   * true simultaneous burst. Acceptable here — this bounds a media
   * pipeline's resource usage, not a correctness-critical limit — and
   * avoids holding any lock for longer than one fast statement.
   */
  async claimBatch(limit: number, maxConcurrent: number): Promise<JobRow[]> {
    const rows = await getDb().execute<{
      id: string;
      name: string;
      payload: unknown;
      attempts: number;
      max_attempts: number;
    }>(sql`
      WITH capacity AS (
        SELECT GREATEST(0, ${maxConcurrent} - count(*))::int AS remaining
        FROM job_queue WHERE status = 'processing'
      ),
      due AS (
        SELECT id FROM job_queue
        WHERE status = 'pending' AND run_at <= now()
        ORDER BY run_at ASC
        LIMIT LEAST(${limit}, (SELECT remaining FROM capacity))
        FOR UPDATE SKIP LOCKED
      )
      UPDATE job_queue
      SET status = 'processing', locked_at = now(), attempts = attempts + 1, updated_at = now()
      WHERE id IN (SELECT id FROM due)
      RETURNING id, name, payload, attempts, max_attempts
    `);
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      payload: row.payload,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
    }));
  },

  async markCompleted(id: string): Promise<void> {
    await getDb().execute(sql`
      UPDATE job_queue SET status = 'completed', locked_at = NULL, last_error = NULL, updated_at = now()
      WHERE id = ${id}
    `);
  },

  /** `attempts` is the row's post-claim count (already incremented by
   *  `claimBatch`) — reaching `maxAttempts` here means this was the last
   *  allowed try. */
  async markFailed(id: string, attempts: number, maxAttempts: number, error: string): Promise<void> {
    const message = error.slice(0, 2000);
    if (attempts >= maxAttempts) {
      await getDb().execute(sql`
        UPDATE job_queue SET status = 'failed', locked_at = NULL, last_error = ${message}, updated_at = now()
        WHERE id = ${id}
      `);
      return;
    }
    const delaySeconds = backoffSeconds(attempts);
    await getDb().execute(sql`
      UPDATE job_queue
      SET status = 'pending', locked_at = NULL, last_error = ${message},
          run_at = now() + (${delaySeconds}::text || ' seconds')::interval, updated_at = now()
      WHERE id = ${id}
    `);
  },

  /** `/admin/jobs`'s list — most-recently-touched first, so an operator
   *  sees what's currently happening (or just went wrong) at the top,
   *  not the oldest row. `status` omitted returns the mixed recent feed
   *  across every status; the page's filter UI is what usually narrows
   *  this before it renders. */
  async search(status: JobStatus | undefined): Promise<JobListItem[]> {
    const rows = await getDb()
      .select({
        id: jobQueue.id,
        name: jobQueue.name,
        status: jobQueue.status,
        attempts: jobQueue.attempts,
        maxAttempts: jobQueue.maxAttempts,
        lastError: jobQueue.lastError,
        createdAt: jobQueue.createdAt,
        updatedAt: jobQueue.updatedAt,
      })
      .from(jobQueue)
      .where(status ? eq(jobQueue.status, status) : undefined)
      .orderBy(desc(jobQueue.updatedAt))
      .limit(LIST_LIMIT);
    return rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  },

  /** Current queue depth per status, for the dashboard's summary counts
   *  — `completed`'s count is scoped to the last 24h (an all-time total
   *  only grows and stops meaning anything; `pending`/`processing`/
   *  `failed` are naturally point-in-time already). Statuses with zero
   *  rows are simply absent from the result — callers default them to
   *  `0`. */
  async countByStatus(): Promise<Partial<Record<JobStatus, number>>> {
    const rows = await getDb().execute<{ status: JobStatus; count: number }>(sql`
      SELECT status, count(*)::int AS count
      FROM job_queue
      WHERE status != 'completed' OR updated_at > now() - interval '24 hours'
      GROUP BY status
    `);
    return Object.fromEntries(rows.map((row) => [row.status, row.count]));
  },

  /** Manual retry — only ever a `failed` row (the `WHERE` is the actual
   *  guard, not just a UI affordance): resets its attempt count so it
   *  gets a full fresh set of tries rather than immediately re-failing
   *  into `failed` on the very next claim. Returns whether a row
   *  actually matched, so the service can tell "retried" apart from
   *  "already gone/no longer failed". */
  async retry(id: string): Promise<boolean> {
    const result = await getDb().execute(sql`
      UPDATE job_queue
      SET status = 'pending', attempts = 0, run_at = now(), locked_at = NULL, last_error = NULL, updated_at = now()
      WHERE id = ${id} AND status = 'failed'
    `);
    return (result.count ?? 0) > 0;
  },

  /** Permanent delete — only ever a `failed` row, same reasoning as
   *  `retry`: this button exists to clear out jobs an operator has
   *  decided aren't worth retrying, never as a way to cancel something
   *  still pending/processing. */
  async remove(id: string): Promise<boolean> {
    const result = await getDb().execute(sql`
      DELETE FROM job_queue WHERE id = ${id} AND status = 'failed'
    `);
    return (result.count ?? 0) > 0;
  },
};
