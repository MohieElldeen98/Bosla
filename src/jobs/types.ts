/**
 * The generic background-job contract for the whole app — not scoped to
 * media. A domain enqueues a typed job and never knows what executes it
 * or how; today `DbJobQueue` (`src/jobs/db-queue.ts`) is the one driver,
 * durable and Vercel-safe (`docs/media-platform.md` "Background
 * processing"). A future driver (a hosted queue, a real worker fleet)
 * implements this same interface and is selected in `src/jobs/index.ts`
 * without touching any enqueue site or the payload types below.
 */

export interface VideoProcessingJobPayload {
  videoId: string;
}

export interface MediaProcessingJobPayload {
  assetId: string;
}

/** Discriminated union of every registered job kind — extend this (and
 *  `src/jobs/handlers.ts`'s registry) to add a new kind; the queue table,
 *  claim logic, and retry/backoff machinery are unchanged by that, since
 *  none of it knows or cares what `name`/`payload` mean.
 *  `video.process` = lesson-video HLS pipeline (`src/video/processing`);
 *  `media.process` = library-asset pipeline: image sizes, video/audio
 *  metadata, document metadata (`src/media/processing`). */
export type QueueJob =
  | { name: "video.process"; payload: VideoProcessingJobPayload }
  | { name: "media.process"; payload: MediaProcessingJobPayload };

export interface JobQueue {
  /** Human-readable driver id ("db", …) — for logs only. */
  readonly name: string;

  /**
   * Hand a job to the driver. Must resolve once the job is durably
   * *accepted* (for `DbJobQueue`: once its row is committed), not when
   * it finishes — callers are request handlers that must return to the
   * user while a 2 GB transcode grinds on. Accepted does not mean
   * started: a job can sit `pending` briefly even under normal
   * operation (see `DbJobQueue`'s own doc comment on the immediate
   * trigger vs. the cron recovery sweep).
   */
  enqueue(job: QueueJob): Promise<void>;
}

export type JobStatus = "pending" | "processing" | "completed" | "failed";

/** The `/admin/jobs` monitoring dashboard's row shape — every field the
 *  UI needs, already string/number/plain (dates as ISO strings), so it
 *  can cross the Server Component → Client Component boundary as-is. */
export interface JobListItem {
  id: string;
  name: string;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export type JobErrorCode = "forbidden" | "not_found" | "unknown";

/** Same shape as every other domain's own copy (`CmsActionResult`,
 *  `ContactActionResult`, …) — never shared across domains. */
export type JobActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; code: JobErrorCode; message: string };
