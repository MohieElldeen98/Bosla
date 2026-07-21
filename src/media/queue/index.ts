import "server-only";

import { InlineJobQueue } from "./inline-queue";
import type { JobQueue } from "./types";

let instance: JobQueue | null = null;

/**
 * Driver selection lives here and only here. `MEDIA_QUEUE_DRIVER` is
 * reserved for future drivers ("bullmq", "sqs", …) — until one exists,
 * every value maps to the inline driver, so setting the var early is
 * harmless. See docs/media-platform.md for what plugging in a real queue
 * involves (implement `JobQueue`, add a case here, run a worker).
 */
export function getMediaQueue(): JobQueue {
  if (!instance) {
    instance = new InlineJobQueue();
  }
  return instance;
}
