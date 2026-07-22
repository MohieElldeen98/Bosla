import { NextResponse } from "next/server";
import { runDueJobs } from "@/jobs/worker";
import { jobsLogger } from "@/jobs/jobs-logger";

/**
 * The job queue's recovery sweep (docs/media-platform.md "Background
 * processing") — NOT the normal way a job gets run; that's
 * `DbJobQueue.enqueue`'s own `after()`-driven immediate trigger, which
 * handles the overwhelming majority of jobs within moments of being
 * enqueued. This route exists for what that path can't guarantee: a job
 * whose immediate trigger never fired (the function died before `after`
 * ran) or whose executing function was killed mid-run — both leave a row
 * that `JobRepository.reclaimStale`/`claimBatch` will pick back up here.
 *
 * `vercel.json` schedules this once daily (`0 0 * * *`) — Vercel's
 * Hobby plan hard-rejects the whole deployment for any cron expression
 * that would run more than once a day (confirmed directly: an earlier
 * every-minute schedule failed deployment outright with "Hobby accounts
 * are limited to daily cron jobs", not a silent downgrade). A Pro plan
 * allows down to once a minute — worth revisiting this schedule if/when
 * this project moves off Hobby, since "recovery within a day" is a much
 * coarser safety net than "within a minute". Either way this is still
 * just the safety net: the immediate-trigger path in `DbJobQueue.enqueue`
 * does effectively all the real work regardless of this schedule.
 */

export const dynamic = "force-dynamic";
// Vercel caps this per-plan regardless of what's requested here (Hobby:
// ~60s max even if you ask for more; Pro/Enterprise: up to 800s+) — set
// high enough for a real transcode to fit on plans that allow it.
export const maxDuration = 300;

// Higher than it'd need to be on a per-minute schedule — this only runs
// once a day on Hobby, so one pass needs to drain a full day's worth of
// anything the immediate trigger missed, not just the last minute's.
const CRON_SWEEP_BATCH = 50;

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  const result = await runDueJobs({ limit: CRON_SWEEP_BATCH });
  jobsLogger.info("cron_sweep", result);
  return NextResponse.json(result);
}
