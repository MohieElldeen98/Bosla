import "server-only";

import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline as streamPipeline } from "node:stream/promises";
import { logger } from "@/lib/logger";
import { CmsMediaRepository } from "@/cms/repositories/media.repository";
import { getMediaStorage } from "@/media/storage";
import { mediaVariantKey } from "@/media/utils/storage-keys";
import type { StorageProvider } from "@/media/storage/types";
import type { MediaLibraryAsset } from "@/cms/types/media-library";
import type { MediaVariant, MediaVariants } from "@/media/types/media-platform";

/**
 * The `media.process` job (docs/media-platform.md "Processing pipeline").
 * Runs once per completed upload, by category:
 *
 *  - image  → sharp: auto-orient + EXIF strip, WebP ladder
 *             (thumb 320 / small 640 / medium 1280 / large 1920, never
 *             upscaled), AVIF for medium+large, dimensions, dominant
 *             color. SVG/GIF skip resizing (vector / animation).
 *  - video / audio → FFmpeg (shared with the lesson-video domain):
 *             duration, dimensions, midpoint thumbnail frame (video).
 *             FFmpeg missing → `skipped`, never `failed`.
 *  - pdf    → pdf-lib: page count + embedded title.
 *  - document / archive / other → nothing to derive; `completed` as-is.
 *
 * Failures mark `processingStatus: "failed"` but NEVER remove the
 * original — an asset with no variants still serves its uploaded bytes.
 */

const IMAGE_LADDER = [
  { name: "thumb", width: 320 },
  { name: "small", width: 640 },
  { name: "medium", width: 1280 },
  { name: "large", width: 1920 },
] as const;

const RESIZABLE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

async function downloadToTemp(storage: StorageProvider, key: string, workDir: string): Promise<string> {
  const destination = path.join(workDir, `source${path.extname(key) || ".bin"}`);
  const url = await storage.createSignedDownloadUrl(key, 60 * 60);
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Could not download the source file (HTTP ${response.status}).`);
  }
  await streamPipeline(
    Readable.fromWeb(response.body as import("node:stream/web").ReadableStream),
    createWriteStream(destination),
  );
  return destination;
}

async function processImage(
  storage: StorageProvider,
  asset: MediaLibraryAsset,
  sourcePath: string,
): Promise<void> {
  const { default: sharp } = await import("sharp");
  const source = sharp(sourcePath, { failOn: "none" });
  const metadata = await source.metadata();
  const stats = await source.clone().stats();
  const dominant = stats.dominant
    ? `#${[stats.dominant.r, stats.dominant.g, stats.dominant.b]
        .map((channel) => channel.toString(16).padStart(2, "0"))
        .join("")}`
    : null;

  const variants: MediaVariants = {};
  if (RESIZABLE_IMAGE_TYPES.has(asset.mimeType) && metadata.width && metadata.height) {
    let previousWidth = 0;
    for (const rung of IMAGE_LADDER) {
      // Never upscale — a 900px source gets thumb/small/medium(≤900),
      // and a rung that would just repeat the previous width is skipped.
      const targetWidth = Math.min(rung.width, metadata.width);
      if (targetWidth === previousWidth) continue;
      previousWidth = targetWidth;
      // `rotate()` applies EXIF orientation, and re-encoding without
      // `withMetadata()` strips EXIF (GPS and all) from every variant.
      const webp = await sharp(sourcePath, { failOn: "none" })
        .rotate()
        .resize({ width: targetWidth, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true });
      const key = mediaVariantKey(asset.id, rung.name, "webp");
      await storage.putObject(key, new Uint8Array(webp.data), "image/webp");
      variants[rung.name] = {
        key,
        width: webp.info.width,
        height: webp.info.height,
        format: "webp",
        size: webp.info.size,
      };
    }
    for (const rung of ["medium", "large"] as const) {
      const base = variants[rung];
      if (!base) continue;
      const avif = await sharp(sourcePath, { failOn: "none" })
        .rotate()
        .resize({ width: base.width, withoutEnlargement: true })
        .avif({ quality: 55 })
        .toBuffer({ resolveWithObject: true });
      const key = mediaVariantKey(asset.id, rung, "avif");
      await storage.putObject(key, new Uint8Array(avif.data), "image/avif");
      const variant: MediaVariant = {
        key,
        width: avif.info.width,
        height: avif.info.height,
        format: "avif",
        size: avif.info.size,
      };
      if (rung === "medium") variants.mediumAvif = variant;
      else variants.largeAvif = variant;
    }
  }

  await CmsMediaRepository.update(asset.id, {
    width: metadata.width ?? asset.width,
    height: metadata.height ?? asset.height,
    dominantColor: dominant,
    variants,
    thumbnailKey: variants.thumb?.key ?? null,
    processingStatus: "completed",
  });
}

async function processAudioVideo(
  storage: StorageProvider,
  asset: MediaLibraryAsset,
  sourcePath: string,
  workDir: string,
): Promise<void> {
  const { isFfmpegAvailable, probeVideo, runFfmpeg } = await import("@/video/processing/ffmpeg");
  if (!(await isFfmpegAvailable())) {
    await CmsMediaRepository.update(asset.id, { processingStatus: "skipped" });
    return;
  }

  if (asset.fileType === "audio") {
    // ffprobe's video-stream probe rejects audio files; a duration-only
    // probe is all an audio asset needs.
    const { spawn } = await import("node:child_process");
    const duration = await new Promise<number | null>((resolve) => {
      const child = spawn(process.env.FFPROBE_PATH || "ffprobe", [
        "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", sourcePath,
      ]);
      let stdout = "";
      child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
      child.on("error", () => resolve(null));
      child.on("close", (code) => resolve(code === 0 ? Math.round(Number(stdout.trim())) || null : null));
    });
    await CmsMediaRepository.update(asset.id, { duration, processingStatus: "completed" });
    return;
  }

  const probe = await probeVideo(sourcePath);
  const thumbnailPath = path.join(workDir, "thumb.jpg");
  await runFfmpeg([
    "-ss", String(Math.max(1, Math.floor(probe.durationSeconds / 2))),
    "-i", sourcePath,
    "-frames:v", "1", "-vf", "scale=640:-2", "-q:v", "3", thumbnailPath,
  ]);
  const thumbKey = mediaVariantKey(asset.id, "thumb", "jpg");
  await storage.putObject(thumbKey, new Uint8Array(await readFile(thumbnailPath)), "image/jpeg");
  await CmsMediaRepository.update(asset.id, {
    width: probe.width,
    height: probe.height,
    duration: probe.durationSeconds,
    thumbnailKey: thumbKey,
    processingStatus: "completed",
  });
}

async function processPdf(asset: MediaLibraryAsset, sourcePath: string): Promise<void> {
  const { PDFDocument } = await import("pdf-lib");
  const bytes = await readFile(sourcePath);
  const document = await PDFDocument.load(new Uint8Array(bytes), {
    updateMetadata: false,
    ignoreEncryption: true,
  });
  const embeddedTitle = document.getTitle()?.trim();
  await CmsMediaRepository.update(asset.id, {
    pageCount: document.getPageCount(),
    ...(embeddedTitle && !asset.title
      ? { title: { en: embeddedTitle, ar: embeddedTitle } }
      : {}),
    processingStatus: "completed",
  });
}

export async function runMediaProcessingPipeline(assetId: string): Promise<void> {
  const asset = await CmsMediaRepository.findLibraryById(assetId);
  if (!asset || !asset.storageKey) {
    logger.error(`[media-pipeline] asset ${assetId} vanished before processing.`);
    return;
  }
  const storage = getMediaStorage();
  if (!storage) {
    await CmsMediaRepository.update(assetId, { processingStatus: "failed" });
    return;
  }

  const needsBytes = asset.fileType === "image" || asset.fileType === "video" || asset.fileType === "audio" || asset.fileType === "pdf";
  if (!needsBytes) {
    await CmsMediaRepository.update(assetId, { processingStatus: "completed" });
    return;
  }

  const workDir = await mkdtemp(path.join(tmpdir(), `bosla-media-${assetId.slice(0, 8)}-`));
  try {
    const sourcePath = await downloadToTemp(storage, asset.storageKey, workDir);
    switch (asset.fileType) {
      case "image":
        await processImage(storage, asset, sourcePath);
        break;
      case "video":
      case "audio":
        await processAudioVideo(storage, asset, sourcePath, workDir);
        break;
      case "pdf":
        await processPdf(asset, sourcePath);
        break;
    }
  } catch (error) {
    logger.error(`[media-pipeline] ${assetId} failed:`, error);
    await CmsMediaRepository.update(assetId, { processingStatus: "failed" });
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
