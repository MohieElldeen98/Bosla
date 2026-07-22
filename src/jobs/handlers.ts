import type { QueueJob } from "@/jobs/types";

/** Job-kind → executor, dynamically imported so FFmpeg/sharp code only
 *  loads into a function's module graph when a job of that kind actually
 *  runs — the same reasoning the old `InlineJobQueue` had for its
 *  dynamic imports, still true now: most requests never touch either. */
export const JOB_HANDLERS: {
  [K in QueueJob["name"]]: (payload: Extract<QueueJob, { name: K }>["payload"]) => Promise<void>;
} = {
  async "video.process"(payload) {
    const { runVideoProcessingPipeline } = await import("@/video/processing/pipeline");
    await runVideoProcessingPipeline(payload.videoId);
  },
  async "media.process"(payload) {
    const { runMediaProcessingPipeline } = await import("@/media/processing/pipeline");
    await runMediaProcessingPipeline(payload.assetId);
  },
};
