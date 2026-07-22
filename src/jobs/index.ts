import "server-only";

import { DbJobQueue } from "@/jobs/db-queue";
import type { JobQueue } from "@/jobs/types";

let instance: JobQueue | null = null;

/** Driver selection lives here and only here — every enqueue site
 *  depends on `JobQueue`, never on `DbJobQueue` directly, so swapping
 *  drivers later (a hosted queue, once Bosla's scale actually needs one)
 *  touches only this file. */
export function getJobQueue(): JobQueue {
  if (!instance) {
    instance = new DbJobQueue();
  }
  return instance;
}
