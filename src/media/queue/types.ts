/**
 * Provider-agnostic background-job contract for the whole media platform.
 * Domains enqueue typed jobs and never know what executes them — today an
 * inline driver runs them in-process (`inline-queue.ts`); a BullMQ /
 * SQS / pg-boss driver later implements this same interface and is
 * selected in `queue/index.ts` without touching any enqueue site.
 */

export interface VideoProcessingJobPayload {
  videoId: string;
}

export interface MediaProcessingJobPayload {
  assetId: string;
}

/** Discriminated union so future job kinds (caption generation, storage
 *  GC, document OCR) extend the vocabulary without a second queue.
 *  `video.process` = lesson-video HLS pipeline (`src/video/processing`);
 *  `media.process` = library-asset pipeline: image sizes, video/audio
 *  metadata, document metadata (`src/media/processing`). */
export type MediaJob =
  | { name: "video.process"; payload: VideoProcessingJobPayload }
  | { name: "media.process"; payload: MediaProcessingJobPayload };

export interface JobQueue {
  /** Human-readable driver id ("inline", "bullmq", …) — for logs only. */
  readonly name: string;

  /**
   * Hand a job to the driver. Must resolve as soon as the job is
   * *accepted*, not when it finishes — callers are request handlers that
   * must return to the user while a 2 GB transcode grinds on.
   */
  enqueue(job: MediaJob): Promise<void>;
}
