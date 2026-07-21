import { logger } from "@/lib/logger";
import type { JobQueue, MediaJob } from "./types";

/**
 * The default driver: runs jobs in this Node process, detached from the
 * enqueuing request (fire-and-forget promise, never awaited by the
 * caller). Correct for a single-instance deployment and for local dev;
 * its limits (no retries across restarts, no concurrency control, dies
 * with the process) are exactly why the `JobQueue` seam exists — see
 * docs/media-platform.md "Background processing".
 *
 * Pipelines are imported dynamically so FFmpeg/sharp/child_process code
 * is only loaded when a job actually runs, keeping it out of every
 * normal request's module graph.
 */
export class InlineJobQueue implements JobQueue {
  readonly name = "inline";

  async enqueue(job: MediaJob): Promise<void> {
    setImmediate(() => {
      void (async () => {
        try {
          switch (job.name) {
            case "video.process": {
              const { runVideoProcessingPipeline } = await import("@/video/processing/pipeline");
              await runVideoProcessingPipeline(job.payload.videoId);
              break;
            }
            case "media.process": {
              const { runMediaProcessingPipeline } = await import("@/media/processing/pipeline");
              await runMediaProcessingPipeline(job.payload.assetId);
              break;
            }
          }
        } catch (error) {
          // Last-resort guard: each pipeline records its own failures on
          // its own row; this catches bugs in that recording itself so an
          // inline job can never produce an unhandled rejection.
          logger.error(`[media-queue] job "${job.name}" crashed:`, error);
        }
      })();
    });
  }
}
