import "server-only";

import { createWriteStream } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline as streamPipeline } from "node:stream/promises";
import { logger } from "@/lib/logger";
import { getMediaStorage } from "@/media/storage";
import { VideoRepository } from "@/video/repositories/video.repository";
import { isFfmpegAvailable, probeVideo, runFfmpeg } from "@/video/processing/ffmpeg";
import {
  videoMasterPlaylistKey,
  videoPreviewKey,
  videoRenditionPlaylistKey,
  videoRenditionSegmentKey,
  videoThumbnailKey,
} from "@/video/utils/storage-keys";
import type { StorageProvider } from "@/media/storage/types";
import type { VideoRendition } from "@/video/types/video";

/**
 * Phase 5 — the transcode pipeline a `video.process` job runs (via the
 * `JobQueue` seam, so this same function is what a future BullMQ worker
 * executes). Ladder: source → H.264/AAC HLS at every standard rung that
 * doesn't upscale (1080/720/480/360), plus master.m3u8, thumbnail.jpg,
 * preview.jpg, and ffprobe metadata. All artifacts land back in the
 * object store under the video's own prefix; the DB row is the only
 * record of what exists.
 *
 * Failure philosophy: FFmpeg *missing* is a deployment state, not an
 * error — the video is marked `ready` with `processingStatus: "skipped"`
 * and plays from its source file. FFmpeg *failing* on a real file is an
 * error — `status: "failed"` with the reason preserved for the UI.
 */

const RENDITION_LADDER = [
  { height: 1080, videoKbps: 5000, audioKbps: 160 },
  { height: 720, videoKbps: 2800, audioKbps: 128 },
  { height: 480, videoKbps: 1400, audioKbps: 128 },
  { height: 360, videoKbps: 800, audioKbps: 96 },
] as const;

const SEGMENT_SECONDS = 6;

async function downloadSource(storage: StorageProvider, key: string, destination: string): Promise<void> {
  // Signed URL + fetch instead of storage.getObject: the source can be
  // gigabytes and must stream to disk, never buffer in memory.
  const url = await storage.createSignedDownloadUrl(key, 60 * 60);
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Could not download the source file (HTTP ${response.status}).`);
  }
  await streamPipeline(
    Readable.fromWeb(response.body as import("node:stream/web").ReadableStream),
    createWriteStream(destination),
  );
}

async function uploadDirectory(
  storage: StorageProvider,
  localDir: string,
  keyFor: (fileName: string) => string,
  contentTypeFor: (fileName: string) => string,
): Promise<void> {
  const files = await readdir(localDir);
  // Segments upload a few at a time — enough parallelism to keep the
  // pipe busy without hundreds of concurrent PUTs.
  const queue = [...files];
  const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
    for (let file = queue.shift(); file; file = queue.shift()) {
      const body = await readFile(path.join(localDir, file));
      await storage.putObject(keyFor(file), new Uint8Array(body), contentTypeFor(file));
    }
  });
  await Promise.all(workers);
}

function playlistContentType(fileName: string): string {
  return fileName.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : "video/mp2t";
}

export async function runVideoProcessingPipeline(videoId: string): Promise<void> {
  const video = await VideoRepository.findById(videoId);
  if (!video) {
    logger.error(`[video-pipeline] video ${videoId} vanished before processing.`);
    return;
  }
  const storage = getMediaStorage();
  if (!storage) {
    await VideoRepository.update(videoId, {
      status: "failed",
      processingStatus: "failed",
      processingError: "Video storage is not configured.",
    });
    return;
  }

  if (!(await isFfmpegAvailable())) {
    // Deployment without FFmpeg: the source file itself is the playable
    // artifact. Clearly recorded, instantly recoverable by re-queueing
    // once FFmpeg exists.
    await VideoRepository.update(videoId, {
      status: "ready",
      processingStatus: "skipped",
      processingError:
        "FFmpeg is not installed on this server — streaming uses the original file without adaptive quality.",
    });
    return;
  }

  await VideoRepository.update(videoId, { processingStatus: "running", processingError: null });

  const workDir = await mkdtemp(path.join(tmpdir(), `bosla-video-${videoId.slice(0, 8)}-`));
  try {
    const sourcePath = path.join(workDir, `source${path.extname(video.storageKey) || ".mp4"}`);
    await downloadSource(storage, video.storageKey, sourcePath);

    const probe = await probeVideo(sourcePath);

    // Never upscale: keep every rung at or below the source height, but
    // always keep at least one so tiny sources still get a proper HLS
    // packaging pass.
    const ladder = RENDITION_LADDER.filter((rung) => rung.height <= probe.height);
    const selected = ladder.length > 0 ? ladder : [RENDITION_LADDER[RENDITION_LADDER.length - 1]];

    const renditions: VideoRendition[] = [];
    for (const rung of selected) {
      const renditionDir = path.join(workDir, `${rung.height}p`);
      await mkdir(renditionDir);
      await runFfmpeg([
        "-i", sourcePath,
        "-vf", `scale=-2:${Math.min(rung.height, probe.height)}`,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-profile:v", "main",
        "-b:v", `${rung.videoKbps}k`,
        "-maxrate", `${Math.round(rung.videoKbps * 1.2)}k`,
        "-bufsize", `${rung.videoKbps * 2}k`,
        "-c:a", "aac",
        "-b:a", `${rung.audioKbps}k`,
        "-ac", "2",
        "-hls_time", String(SEGMENT_SECONDS),
        "-hls_playlist_type", "vod",
        "-hls_segment_filename", path.join(renditionDir, "seg_%05d.ts"),
        path.join(renditionDir, "index.m3u8"),
      ]);
      await uploadDirectory(
        storage,
        renditionDir,
        (file) =>
          file === "index.m3u8"
            ? videoRenditionPlaylistKey(videoId, rung.height)
            : videoRenditionSegmentKey(videoId, rung.height, file),
        playlistContentType,
      );
      // Width follows the source aspect ratio, rounded to the even value
      // the encoder actually produced (scale=-2).
      const width = 2 * Math.round((probe.width / probe.height) * Math.min(rung.height, probe.height) / 2);
      renditions.push({
        height: rung.height,
        width,
        bitrateKbps: rung.videoKbps,
        playlistKey: videoRenditionPlaylistKey(videoId, rung.height),
      });
    }

    // The master playlist references variant playlists by the relative
    // path they live at in the bucket — the playback route rewrites these
    // lines into authorized API URLs at request time (Phase 6).
    const master = [
      "#EXTM3U",
      "#EXT-X-VERSION:3",
      ...renditions.flatMap((rendition) => [
        `#EXT-X-STREAM-INF:BANDWIDTH=${Math.round(rendition.bitrateKbps * 1000 * 1.3)},RESOLUTION=${rendition.width}x${rendition.height}`,
        `${rendition.height}p/index.m3u8`,
      ]),
      "",
    ].join("\n");
    await storage.putObject(
      videoMasterPlaylistKey(videoId),
      new TextEncoder().encode(master),
      "application/vnd.apple.mpegurl",
    );

    // Thumbnail (list/card image) early in the video; preview (player
    // poster) from the midpoint where the frame is representative.
    const thumbnailPath = path.join(workDir, "thumbnail.jpg");
    const previewPath = path.join(workDir, "preview.jpg");
    const midpoint = Math.max(1, Math.floor(probe.durationSeconds / 2));
    await runFfmpeg([
      "-ss", String(Math.min(3, midpoint)), "-i", sourcePath,
      "-frames:v", "1", "-vf", "scale=640:-2", "-q:v", "3", thumbnailPath,
    ]);
    await runFfmpeg([
      "-ss", String(midpoint), "-i", sourcePath,
      "-frames:v", "1", "-vf", "scale=1280:-2", "-q:v", "2", previewPath,
    ]);
    await storage.putObject(videoThumbnailKey(videoId), new Uint8Array(await readFile(thumbnailPath)), "image/jpeg");
    await storage.putObject(videoPreviewKey(videoId), new Uint8Array(await readFile(previewPath)), "image/jpeg");

    await VideoRepository.update(videoId, {
      status: "ready",
      processingStatus: "completed",
      processingError: null,
      manifestKey: videoMasterPlaylistKey(videoId),
      thumbnailKey: videoThumbnailKey(videoId),
      previewKey: videoPreviewKey(videoId),
      duration: probe.durationSeconds,
      metadata: {
        ...video.metadata,
        sourceWidth: probe.width,
        sourceHeight: probe.height,
        sourceCodec: probe.codec,
        renditions,
      },
    });
    // The pipeline's ffprobe duration is the source of truth for the
    // lesson's own Duration field — overwrite whatever the instructor's
    // browser estimated (or left blank) at upload time.
    if (video.lessonId && probe.durationSeconds > 0) {
      const { LessonRepository } = await import("@/learning/repositories/lesson.repository");
      await LessonRepository.update(video.lessonId, { durationSeconds: probe.durationSeconds }).catch(
        (error) => logger.warn(`[video-pipeline] could not sync lesson duration:`, error),
      );
    }
    logger.info(
      `[video-pipeline] ${videoId} ready: ${renditions.map((rendition) => `${rendition.height}p`).join(", ")}`,
    );
  } catch (error) {
    logger.error(`[video-pipeline] ${videoId} failed:`, error);
    await VideoRepository.update(videoId, {
      status: "failed",
      processingStatus: "failed",
      processingError: error instanceof Error ? error.message.slice(0, 1000) : "Processing failed.",
    });
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
