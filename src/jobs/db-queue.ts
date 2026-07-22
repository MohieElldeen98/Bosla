import "server-only";

import { after } from "next/server";
import { JobRepository } from "@/jobs/repository";
import { runDueJobs } from "@/jobs/worker";
import { jobsLogger } from "@/jobs/jobs-logger";
import type { JobQueue, QueueJob } from "@/jobs/types";

/** How many due jobs `enqueue`'s own immediate trigger tries to drain in
 *  one pass — deliberately small (not "process everything due"): this
 *  runs inside the *enqueuing* request's own function invocation via
 *  `after()`, so it competes with that request's own Vercel execution
 *  time budget. Anything it doesn't get to stays `pending` and is picked
 *  up by the next enqueue's trigger or the cron recovery sweep
 *  (`src/app/api/cron/process-jobs/route.ts`) — never lost, per
 *  `JobRepository`'s durability guarantees. */
const IMMEDIATE_TRIGGER_BATCH = 2;

/**
 * The durable, Vercel-safe `JobQueue` driver — replaces the old
 * `InlineJobQueue`, which ran jobs via a bare `setImmediate` with no
 * guarantee the function stayed alive to finish them. Two things make
 * this durable instead:
 *
 *  1. `enqueue` durably INSERTs the job row before doing anything else —
 *     that row, not any in-memory state, is the source of truth that a
 *     job exists and needs running. If everything after this point never
 *     happens, the job is still safely `pending` in the database.
 *
 *  2. The *attempt* to run it right away goes through `next/server`'s
 *     `after()` — Vercel's documented mechanism for "do this after the
 *     response is sent, and keep the function alive until it settles"
 *     (unlike `setImmediate`, which has no such guarantee and can be cut
 *     off the moment the response ships). This is the normal path: most
 *     jobs run within moments of being enqueued, in the same function
 *     invocation that created them — no extra HTTP round-trip, no
 *     dependency on the app's own public URL being reachable.
 *
 * If `after()` itself never runs (the platform kills the function before
 * even that, or the attempt throws), the job is simply still `pending` —
 * the cron sweep is the recovery mechanism for exactly that case, not
 * the normal path. See docs/media-platform.md "Background processing".
 */
export class DbJobQueue implements JobQueue {
  readonly name = "db";

  async enqueue(job: QueueJob): Promise<void> {
    const id = await JobRepository.insert(job);
    after(async () => {
      try {
        await runDueJobs({ limit: IMMEDIATE_TRIGGER_BATCH });
      } catch (error) {
        // The cron sweep will pick this job up on its next run — this is
        // a missed optimization (near-instant processing), not a lost
        // job, so a warning is enough.
        jobsLogger.warn("immediate_trigger_failed", {
          jobId: id,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }
}
