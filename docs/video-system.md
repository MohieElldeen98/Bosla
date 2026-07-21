# Video Upload & Streaming System

Production-grade lesson-video pipeline: browser-direct resumable uploads to
object storage, FFmpeg HLS transcoding, and authorized, signed-URL-only
playback. The Next.js server **never proxies video bytes** — it only
authenticates, authorizes, mints short-lived signed URLs, stores metadata,
and serves rewritten playlist text.

## Architecture

| Layer | Location | Responsibility |
| --- | --- | --- |
| Storage abstraction | `src/video/storage/` | `StorageProvider` interface + S3-compatible implementation (R2 & AWS S3) |
| Upload backend | `src/video/services/video-upload.service.ts`, `src/video/actions/video.actions.ts` | Multipart session lifecycle: create → sign parts → complete/abort |
| Upload client | `src/components/video/upload/upload-engine.ts` | Resumable chunked uploads (pause/resume/retry/cancel, persistence) |
| Upload UI | `src/components/video/upload/VideoUploadPanel.tsx` | Drag & drop, progress/speed/ETA, multi-upload; in the Curriculum Builder's lesson sheet |
| Database | `src/db/schema/video.ts` (`videos` table) | Source of truth for status, keys, metadata |
| Queue | `src/video/queue/` | `JobQueue` interface; inline driver today, real queue pluggable |
| Processing | `src/video/processing/` | FFmpeg: HLS ladder, master playlist, thumbnail, preview, metadata |
| Playback API | `src/app/api/video/[videoId]/stream/[...path]/route.ts` | Authorization + playlist rewriting + signed redirects |
| Player | `src/components/player/BoslaPlayer.tsx` | hls.js adaptive playback, quality menu, PiP, remembered volume/speed |

### Upload flow

```
Browser                     Next.js (actions)                R2 / S3
  │  createVideoUploadAction   │                                │
  ├───────────────────────────►│  auth + insert videos row      │
  │                            ├───────────────────────────────►│ CreateMultipartUpload
  │   {videoId, partSize}      │◄───────────────────────────────┤
  │◄───────────────────────────┤                                │
  │  signVideoUploadPartsAction (batches of ≤20)                │
  ├───────────────────────────►├── presign UploadPart URLs ────►│
  │◄───────────────────────────┤                                │
  │  PUT chunk (XHR, direct — bytes never touch Next.js)        │
  ├────────────────────────────────────────────────────────────►│
  │  completeVideoUploadAction  │                               │
  ├───────────────────────────►├── CompleteMultipartUpload ────►│
  │                            ├── enqueue "video.process" job  │
```

Resumability is tus-style but deliberately **not** the tus wire protocol: a
tus server must receive the upload bytes, which would violate the "server
never proxies uploads" rule. Instead, completed parts (number + ETag) are
persisted in `localStorage` keyed by a file fingerprint (name+size+mtime);
re-dropping the same file resumes from the last completed 16 MB chunk, and
the server holds the multipart `uploadId` on the `videos` row.

### Playback flow

```
Player ──► GET /api/video/:id/stream/master.m3u8      (session cookie)
             │ authorize: enrolled? preview lesson? owner/admin?
             │ master playlist passes through (relative variant refs
             │ resolve back onto this API route)
Player ──► GET /api/video/:id/stream/720p/index.m3u8  (re-authorized)
             │ each segment line rewritten to a presigned GET URL
Player ──► GET https://bucket…/videos/:id/hls/720p/seg_00042.ts?X-Amz-…
             │ bytes flow storage → browser directly
```

Students never see storage keys or permanent URLs. Playlist requests are
re-authorized every time; segment URLs expire (default 2 h — long enough
for one uninterrupted viewing session of a VOD playlist, which hls.js
fetches once; tune with `VIDEO_PLAYBACK_URL_TTL_SECONDS`). Thumbnails and
posters redirect through the same authorized route with 5-minute URLs.

Videos processed while FFmpeg was unavailable (`processingStatus:
"skipped"`) stream from the original file via `/stream/source` (302 to a
signed URL) — playback still works, just without adaptive quality.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `VIDEO_STORAGE_PROVIDER` | yes* | `r2` or `s3` |
| `VIDEO_STORAGE_BUCKET` | yes* | Bucket name |
| `VIDEO_STORAGE_REGION` | yes* | `auto` for R2; real region for S3 |
| `VIDEO_STORAGE_ENDPOINT` | R2 only | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `VIDEO_STORAGE_ACCESS_KEY_ID` | yes* | |
| `VIDEO_STORAGE_SECRET_ACCESS_KEY` | yes* | |
| `FFMPEG_PATH` / `FFPROBE_PATH` | no | Defaults to `$PATH` lookup |
| `VIDEO_PLAYBACK_URL_TTL_SECONDS` | no | Signed segment URL lifetime, default 7200 |

\* "Required" to enable the feature. With the block missing, the app
builds and runs normally; the upload UI shows a "not configured"
placeholder, actions return `code: "not_configured"`, and the playback
route answers 503. (`src/lib/env.ts` → `videoStorageEnv`,
`src/video/storage/index.ts` → `getVideoStorage()`.)

## Required accounts

- **Cloudflare account** (default provider): R2 subscription enabled.
- Or an **AWS account** with an S3 bucket (see "Switching to AWS S3").
- No other external services — the queue is in-process and FFmpeg is a
  local binary.

## Local development

1. `pnpm install` (already includes `@aws-sdk/client-s3`,
   `@aws-sdk/s3-request-presigner`, `hls.js`).
2. Install FFmpeg: `brew install ffmpeg` (macOS) / `apt install ffmpeg`.
3. Configure the `VIDEO_STORAGE_*` block in `.env.local` (an R2 bucket
   works fine from localhost) and apply the DB migration
   (`drizzle/0022_videos.sql`).
4. Configure bucket CORS (below) with `http://localhost:3000` as an
   allowed origin.
5. `pnpm dev`, open a course → Curriculum → edit a video lesson → drop a
   file in the upload panel.

## Production deployment

- Apply migration `drizzle/0022_videos.sql`.
- Set the `VIDEO_STORAGE_*` env block.
- Ensure FFmpeg exists in the runtime image (or set `FFMPEG_PATH`).
  **Note:** on serverless hosts (Vercel), inline transcoding of large
  files will exceed function limits — deploy a worker (below) or accept
  source-file playback (`processingStatus: "skipped"`).
- Bucket CORS must allow the production origin.

## Configuring Cloudflare R2

1. Cloudflare dashboard → R2 → Create bucket (keep it **private**; no
   public access, no custom domain needed).
2. R2 → Manage API Tokens → Create token with **Object Read & Write**
   scoped to that bucket. Copy the Access Key ID / Secret.
3. Env:
   ```
   VIDEO_STORAGE_PROVIDER=r2
   VIDEO_STORAGE_BUCKET=<bucket>
   VIDEO_STORAGE_REGION=auto
   VIDEO_STORAGE_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   VIDEO_STORAGE_ACCESS_KEY_ID=…
   VIDEO_STORAGE_SECRET_ACCESS_KEY=…
   ```
4. Bucket settings → CORS policy:
   ```json
   [
     {
       "AllowedOrigins": ["https://your-domain.com", "http://localhost:3000"],
       "AllowedMethods": ["GET", "PUT"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
   `ExposeHeaders: ["ETag"]` is **mandatory** — multipart completion needs
   each part's ETag, and the upload engine fails fast with a clear error
   if the browser can't read it.

## Switching to AWS S3

Config-only — no code changes:

```
VIDEO_STORAGE_PROVIDER=s3
VIDEO_STORAGE_BUCKET=<bucket>
VIDEO_STORAGE_REGION=us-east-1        # your region
VIDEO_STORAGE_ENDPOINT=               # empty
VIDEO_STORAGE_ACCESS_KEY_ID=…         # IAM user with s3:* on the bucket
VIDEO_STORAGE_SECRET_ACCESS_KEY=…
```

Apply the same CORS policy on the S3 bucket (S3 console → Permissions →
CORS). Block all public access; the app only ever uses signed URLs. Both
providers run through `S3CompatibleStorageProvider`; a genuinely
different provider implements `StorageProvider`
(`src/video/storage/types.ts`) and gets a case in
`src/video/storage/index.ts`.

## Enabling FFmpeg

The pipeline shells out to `ffmpeg`/`ffprobe` (no bundled binaries). If
they're missing, uploads succeed and videos are marked `ready` with
`processingStatus: "skipped"` — streaming falls back to the original
file. Install FFmpeg and (if needed) point `FFMPEG_PATH`/`FFPROBE_PATH`
at the binaries; new uploads then produce the full ladder:
1080p/720p/480p/360p H.264+AAC HLS (6 s segments), `master.m3u8`,
`thumbnail.jpg` (640 w), `preview.jpg` (1280 w, player poster), duration
and rendition metadata. Rungs above the source height are skipped (no
upscaling).

## Enabling background workers

Today `getVideoQueue()` returns `InlineJobQueue`: jobs run in the Next.js
process, detached from the request. Fine for a single always-on instance;
wrong for serverless or heavy load. To plug in a real queue:

1. Implement `JobQueue` (`src/video/queue/types.ts`) — e.g. a BullMQ
   driver whose `enqueue` does `queue.add(job.name, job.payload)`.
2. Select it in `src/video/queue/index.ts` (the `VIDEO_QUEUE_DRIVER` env
   name is reserved for this).
3. Run a worker process that consumes jobs and calls
   `runVideoProcessingPipeline(videoId)`
   (`src/video/processing/pipeline.ts`) — the pipeline is already
   self-contained and idempotent per video, so the worker is a thin loop.

## Known limitations

- **Inline processing lifetime** — on serverless hosts the inline queue's
  job can be killed with the function; the video then stays in
  `processing` until re-queued. Use a worker in production.
- **No stalled-job reaper** — a crash mid-transcode leaves
  `processingStatus: "running"`; re-enqueueing `video.process` for the
  video is safe and resumes from scratch.
- **Segment URL lifetime vs. instant revocation** — signed segment URLs
  outlive an enrollment revoked mid-session by up to the TTL. Playlist
  requests (page load, quality switch) re-authorize immediately.
- **Abandoned multipart uploads** — cancelled tabs that never call abort
  leave parts in the bucket. Add a bucket lifecycle rule ("abort
  incomplete multipart uploads after 7 days") — one click in R2/S3.
- **No DRM** — signed URLs + watermarking deter casual sharing; they are
  not Widevine/FairPlay.
- **Captions** — the player supports text tracks, but no caption upload
  UI exists yet for pipeline videos.
