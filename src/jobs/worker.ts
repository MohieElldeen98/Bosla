import "server-only";

import { JobRepository, type JobRow } from "@/jobs/repository";
import { JOB_HANDLERS } from "@/jobs/handlers";
import { jobsLogger } from "@/jobs/jobs-logger";
import type { QueueJob } from "@/jobs/types";

/** How many jobs may be `processing` at once, app-wide — a soft cap (see
 *  `JobRepository.claimBatch`'s doc comment), not a hard guarantee.
 *  Deliberately small: every job here eventually calls `sharp`/FFmpeg,
 *  and this process also serves ordinary page requests through the same
 *  `max: 1` Postgres connection (`src/db/index.ts`) — a handful of
 *  simultaneous transcodes is already enough to compete meaningfully for
 *  CPU/memory (this is the same pressure the "Media Performance Audit"
 *  traced the dev-mode memory-threshold restarts to). */
const MAX_CONCURRENT_JOBS = 3;

function isKnownJob(name: string, payload: unknown): payload is QueueJob["payload"] {
  return name in JOB_HANDLERS && payload !== null && typeof payload === "object";
}

async function runOne(row: JobRow): Promise<void> {
  try {
    if (!isKnownJob(row.name, row.payload)) {
      throw new Error(`No handler registered for job "${row.name}".`);
    }
    const handler = JOB_HANDLERS[row.name as QueueJob["name"]];
    await handler(row.payload as never);
    await JobRepository.markCompleted(row.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    jobsLogger.error("job_failed", {
      jobId: row.id,
      name: row.name,
      attempt: row.attempts,
      maxAttempts: row.maxAttempts,
      message,
    });
    await JobRepository.markFailed(row.id, row.attempts, row.maxAttempts, message);
  }
}

/**
 * One worker pass: reclaim anything stuck from a dead function, claim up
 * to `limit` due jobs (bounded by `MAX_CONCURRENT_JOBS` regardless of
 * `limit`), and run them. Called from two places with different
 * intent — `DbJobQueue.enqueue`'s `after()` callback (the normal path,
 * `limit: 1`, "handle what I just added") and the cron route (the
 * recovery sweep, a larger `limit`, "catch up on anything the normal
 * path missed"). Both share this one implementation so there is exactly
 * one place that decides how a job is claimed, run, and retried.
 *
 * Claimed jobs run sequentially within this pass, not
 * `Promise.all`-parallel — real concurrency comes from multiple worker
 * passes overlapping (bounded by `MAX_CONCURRENT_JOBS` at the DB level),
 * not from one pass fanning out, so one function invocation's own
 * memory footprint stays predictable.
 */
export async function runDueJobs({ limit }: { limit: number }): Promise<{ reclaimed: number; ran: number }> {
  const reclaimed = await JobRepository.reclaimStale();
  if (reclaimed > 0) {
    jobsLogger.warn("jobs_reclaimed", { count: reclaimed });
  }

  const claimed = await JobRepository.claimBatch(limit, MAX_CONCURRENT_JOBS);
  for (const row of claimed) {
    await runOne(row);
  }
  return { reclaimed, ran: claimed.length };
}
