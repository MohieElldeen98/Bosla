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
 * `vercel.json` schedules this to run every minute — Vercel's minimum
 * interval, and it requires a Pro (or higher) plan; on Hobby, Vercel
 * silently limits cron schedules to once per day, which turns this from
 * "recovery within a minute" into "recovery within a day". If this is
 * deployed on Hobby, the immediate-trigger path is doing effectively all
 * the real work and this sweep is a much coarser safety net than
 * intended — worth confirming the plan before relying on this for
 * anything time-sensitive.
 */

export const dynamic = "force-dynamic";
// Vercel caps this per-plan regardless of what's requested here (Hobby:
// ~60s max even if you ask for more; Pro/Enterprise: up to 800s+) — set
// high enough for a real transcode to fit on plans that allow it.
export const maxDuration = 300;

const CRON_SWEEP_BATCH = 10;

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
