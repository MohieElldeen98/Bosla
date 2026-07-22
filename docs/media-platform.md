# Bosla Media Platform

The single media system for the entire application. Every uploaded file —
images, videos, PDFs, Office documents, audio, archives — goes through one
storage abstraction, one upload engine, one library, and one delivery/
authorization surface. Supabase Storage is no longer a media backend
anywhere in the codebase.

The lesson-video HLS system (docs/video-system.md) is this platform's
specialized video pipeline: same `StorageProvider`, same `JobQueue`, same
client upload engine — a different processing profile (full transcode
ladder + secure playlist playback) for one asset class.

## Architecture

```
                       ┌────────────────────────────────────────────┐
Browser ──presigned──► │  R2 / S3 bucket (one, private)             │
   ▲  PUT (direct)     │   library/<assetId>/original.* + variants  │
   │                   │   videos/<videoId>/source|hls|thumbs       │
   │ signed URLs       └────────────▲───────────────────────────────┘
   │ (302 redirects)                │ StorageProvider (S3-compatible)
┌──┴──────────────────────────────  │  ────────────────────────────┐
│ Next.js (metadata only — bytes never pass through)               │
│  media/actions ─ MediaUploadService ─ JobQueue ─ media.process   │
│  /api/media/[id]/…  ─ visibility auth ─ signed redirect          │
│  /api/video/[id]/stream/… ─ playback auth ─ playlist rewrite     │
└──────────────────────────────────────────────────────────────────┘
```

## Background processing

`src/jobs/` is a durable, generic job queue — not media-specific, even
though `media.process`/`video.process` are its only two job kinds today.
It replaced an earlier in-process `InlineJobQueue` (`setImmediate`, ran in
the same request's function) that had no way to survive that function
being torn down mid-job — the normal lifecycle of a Vercel serverless
function, not an edge case. A job now has to survive that.

**Durability**: `job_queue` (Postgres) is the source of truth for "this
job exists and needs running" — not any function's memory.
`DbJobQueue.enqueue` INSERTs the row *before* attempting anything else;
if everything after that point fails, the job is still safely `pending`.

**The normal path is immediate, not polling**: `enqueue` schedules a
same-invocation attempt to run due jobs via `next/server`'s `after()` —
Vercel's documented "run this after the response ships, and keep the
function alive until it settles" mechanism. Most jobs run within moments
of being enqueued, in the same function that created them; no extra HTTP
hop, no dependency on the app's own URL being reachable.

**Recovery, not the primary path**: `GET /api/cron/process-jobs`
(`vercel.json`, every minute — Vercel's minimum interval, Pro plan or
higher; Hobby silently caps cron at once/day) reclaims any `processing`
row whose lock has gone stale (>15 min — presumed crashed) and claims
whatever's still `pending`. This is what actually delivers "survives
function termination" — the immediate trigger is a latency optimization
on top of it, not the guarantee itself.

**Retries & concurrency**: a failed job is retried with exponential
backoff (30s → 1hr cap) up to `max_attempts` (default 5), then marked
`failed` with `last_error` preserved. Concurrency is capped app-wide
(`MAX_CONCURRENT_JOBS` in `src/jobs/worker.ts`, default 3) via an atomic
`FOR UPDATE SKIP LOCKED` claim — soft, not linearizable under true
simultaneous bursts (documented in `JobRepository.claimBatch`), which is
an accepted trade-off for a resource cap, not a correctness guarantee.

Adding a new job kind: add its payload type + a `QueueJob` union member
in `src/jobs/types.ts`, register a handler in `src/jobs/handlers.ts`,
call `getJobQueue().enqueue(...)` from wherever the work originates. The
table, claim logic, and retry/backoff are unchanged by that — nothing
about them is aware of what a "media.process" or "video.process" job
actually does.

## Folder structure

| Path | Role |
| --- | --- |
| `src/media/storage/` | `StorageProvider` interface + `S3CompatibleStorageProvider` (R2 & AWS S3), `getMediaStorage()` |
| `src/jobs/` | `JobQueue` interface, durable Postgres-backed driver, `getJobQueue()`; jobs: `media.process`, `video.process` (below) |
| `src/media/processing/pipeline.ts` | `media.process`: image ladder (sharp), AV metadata (FFmpeg), PDF metadata (pdf-lib) |
| `src/media/services/media-upload.service.ts` | Upload sessions: single presigned PUT / auto-multipart, duplicate reuse, replace-in-place |
| `src/media/services/media-delivery.service.ts` | Delivery URLs + the visibility gate |
| `src/media/actions/media-upload.actions.ts` | The ONE upload server-action surface |
| `src/media/upload/engine.ts` | The ONE browser upload engine (chunking, pause/resume/retry, persistence, speed/ETA) |
| `src/media/upload/media-transport.ts`, `src/components/video/upload/video-transport.ts` | Domain adapters feeding the engine |
| `src/media/constants/mime.ts`, `src/media/utils/storage-keys.ts` | MIME vocabulary, size caps, key layout |
| `src/app/api/media/[assetId]/[...slot]/route.ts` | Protected delivery (302 → signed URL) |
| `src/cms/services/media.service.ts` + repository | Library rows: reads, metadata edits, folders, search, delete |
| `src/components/admin/media/*` | Library UI: grid, bulk ops, detail sheet, upload zone, picker |
| `src/video/**` | Lesson-video extension (docs/video-system.md) |

## Database schema

One base entity: `cms_media_assets` (the physical table name predates the
platform; every FK in the app points at it, so the name stays — the
drizzle schema documents it as the unified media table). Platform columns
added in `drizzle/0023_unified-media-platform.sql`:

- `storage_key` — object key in the platform bucket; **`NULL` = legacy
  Supabase-era row** whose stored `url` keeps serving until migrated
- `thumbnail_key`, `variants` (jsonb image ladder), `duration`,
  `dominant_color`, `page_count`
- `processing_status` (`pending|running|completed|failed|skipped`)
- `visibility` (`public|authenticated|private|course_protected`)
- `related_entity` + `related_entity_id` — loose polymorphic pointer
  (e.g. `course` + course id for `course_protected`)
- `last_used_at` — "recently used" signal
- `media_file_type` enum widened: `image|video|pdf|audio|document|archive|other`

Video-specific metadata extends the base through the `videos` table
(status, HLS manifest keys, renditions — see docs/video-system.md).

## Upload lifecycle

1. `createMediaUploadAction` → validates MIME/size per category, checks
   duplicates (same uploader + name + size → returns the existing asset),
   inserts the row (`processing_status: pending`), and returns a session:
   **single** presigned PUT below 64 MB, **multipart** at or above it.
2. The shared engine PUTs bytes directly to storage — progress, speed,
   ETA, pause/resume (multipart), retry with backoff, resumable across
   page reloads via localStorage part ledgers.
3. `completeMediaUploadAction` → verifies the object with `head()`,
   records the audit log, enqueues `media.process`.
4. The pipeline derives per-category artifacts and flips
   `processing_status` to `completed` (or `skipped`/`failed`).

### Image pipeline
sharp: auto-orientation, EXIF stripped from every variant, WebP ladder
thumb 320 / small 640 / medium 1280 / large 1920 (never upscaled), AVIF
for medium+large, dimensions, dominant color. SVG/GIF keep their original
only.

### Video/audio pipeline (library assets)
FFmpeg: duration, dimensions, midpoint thumbnail frame. FFmpeg missing →
`skipped`, the original still serves. (Lesson videos instead run the full
HLS ladder in `src/video/processing`.)

### Document pipeline
pdf-lib: page count + embedded title. Office/CSV/ZIP store size + MIME
(a preview raster would need a headless renderer — extension point below).

## Media lifecycle & cleanup

- Every asset's objects live under one prefix (`library/<id>/`);
  delete = one `deletePrefix` + row delete (storage first, row second, so
  a failed storage delete is retryable).
- Replace-in-place keeps the asset id (all references keep working):
  old prefix cleared, new bytes land, pipeline re-runs.
- Canceled uploads abort the multipart session and delete the row.
- Add a bucket lifecycle rule "abort incomplete multipart uploads after
  7 days" for uploads that vanish mid-flight (one click in R2/S3 — the
  same rule the video system already uses).

## Security model

- The bucket is **private**; no permanent public object URLs exist.
- `public` assets: served from `MEDIA_PUBLIC_BASE_URL` (CDN/custom
  domain) when configured, else through `/api/media/[id]/file`.
- `authenticated` / `private` / `course_protected`: ALWAYS through
  `/api/media/[id]/…`, which re-authorizes per request
  (`authorizeMediaAccess`) and 302s to a 15-minute signed URL.
  `course_protected` checks enrollment / course ownership / manager role
  against `related_entity_id`.
- Lesson videos keep their own stricter playback route
  (`/api/video/[id]/stream/…`, docs/video-system.md).
- Uploads: instructor/admin/super_admin only; multipart steps re-verify
  asset ownership on every signing batch.

## Environment variables

| Variable | Notes |
| --- | --- |
| `MEDIA_STORAGE_PROVIDER` | `r2` or `s3` (alias: `VIDEO_STORAGE_PROVIDER`) |
| `MEDIA_STORAGE_BUCKET` / `_REGION` / `_ENDPOINT` / `_ACCESS_KEY_ID` / `_SECRET_ACCESS_KEY` | Same aliasing; endpoint only for R2/S3-compatibles |
| `MEDIA_PUBLIC_BASE_URL` | Optional CDN base for public assets; add its host to `images.remotePatterns` |
| `FFMPEG_PATH` / `FFPROBE_PATH` | Optional binary paths |
| `MEDIA_QUEUE_DRIVER` | Reserved for real queue drivers |

Missing credentials never break the build: `getMediaStorage()` returns
`null`, actions answer "not configured", upload UIs render placeholders,
delivery routes return 503.

## Cloudflare R2 setup

Same bucket and token as docs/video-system.md (one bucket serves the
whole platform). CORS must allow `GET, PUT` from your origins and
**expose the `ETag` header** (multipart completion depends on it).
Optionally attach a custom domain / r2.dev subdomain to the bucket and
set it as `MEDIA_PUBLIC_BASE_URL` — public images then bypass the API
hop entirely.

## AWS compatibility

Config-only swap: `MEDIA_STORAGE_PROVIDER=s3`, real region, empty
endpoint, IAM credentials, same CORS. Both providers run through
`S3CompatibleStorageProvider`; a non-S3 provider implements
`StorageProvider` and gets a case in `src/media/storage/index.ts`.

## Migration guide (Supabase → platform)

1. Apply `drizzle/0023_unified-media-platform.sql`.
2. Deploy — new uploads immediately go to R2; legacy rows
   (`storage_key IS NULL`) keep serving their stored Supabase URLs.
3. Copy the bytes: `node --env-file=.env.local scripts/migrate-media-to-r2.mjs`
   (idempotent; `--dry-run` first). Each row flips to R2 as it copies.
4. When `SELECT count(*) FROM cms_media_assets WHERE storage_key IS NULL`
   is 0, delete the Supabase Storage buckets `media` and `avatars` and
   their storage policies — nothing references them anymore.

## Future extension points

- **Hosted queue**: if `src/jobs`'s Postgres-backed driver ever stops
  being enough (very high job volume, need for cross-region workers),
  implement `JobQueue` against a hosted queue and swap the one line in
  `src/jobs/index.ts` — no enqueue site changes.
- **Document previews**: raster first PDF/Office page in `media.process`
  (needs poppler/libreoffice in the runtime image).
- **Responsive images**: `variants` already stores the full ladder with
  dimensions — a `<MediaImage>` component can emit `srcset` from it.
- **Avatar UI**: `ProfileService.setAvatarUrl` is the persistence hook;
  point a `MediaUploadZone` (folder `avatars`) at it.
- **New providers / DRM / captions**: all behind existing seams.
