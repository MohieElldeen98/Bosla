import "server-only";

import { logger } from "@/lib/logger";
import { EnrollmentService } from "@/learning/services/enrollment.service";
import { LessonService } from "@/learning/services/lesson.service";
import { requireOwnCourseAccess } from "@/learning/utils/require-own-course-access";
import { getMediaStorage } from "@/media/storage";
import { VideoRepository } from "@/video/repositories/video.repository";
import { videoRenditionSegmentKey } from "@/video/utils/storage-keys";
import type { StorageProvider } from "@/media/storage/types";
import type { Video } from "@/video/types/video";
import type { AuthUser } from "@/auth/types/session";

/**
 * Phase 6 — the authorization + URL-minting half of playback. The design
 * rule it enforces: a student's browser NEVER sees a storage key or a
 * permanent URL. Playlists flow through the API route (tiny text,
 * rewritten per request); the actual media bytes go browser → object
 * store directly via short-lived presigned URLs minted here, per
 * authorized request.
 *
 * Segment URL lifetime is a real tradeoff, not an oversight: hls.js
 * fetches a VOD variant playlist once, so its segment URLs must survive
 * one uninterrupted viewing session — expiring them in seconds would
 * break seeking an hour into a lecture. Default 2h, tunable via
 * `VIDEO_PLAYBACK_URL_TTL_SECONDS`. Playlist *authorization* is still
 * re-checked on every playlist request (every page load / quality
 * switch).
 */

const IMAGE_URL_TTL_SECONDS = 5 * 60;

function segmentTtlSeconds(): number {
  const raw = Number(process.env.VIDEO_PLAYBACK_URL_TTL_SECONDS);
  return Number.isFinite(raw) && raw >= 60 ? Math.floor(raw) : 2 * 60 * 60;
}

export type PlaybackAuthResult =
  | { ok: true; video: Video }
  | { ok: false; status: 401 | 403 | 404 };

/**
 * Who may watch: an actively-enrolled student, anyone at all when the
 * attached lesson is a free preview, and the course's own instructor or
 * an admin (via the same `requireOwnCourseAccess` gate the authoring
 * side uses). Not-found and not-yours both collapse to 404 for signed-in
 * users probing ids.
 */
export async function authorizeVideoPlayback(
  actingUser: AuthUser | null,
  videoId: string,
): Promise<PlaybackAuthResult> {
  const video = await VideoRepository.findById(videoId);
  if (!video || video.status !== "ready") {
    return { ok: false, status: 404 };
  }

  if (video.lessonId) {
    const lesson = await LessonService.getById(video.lessonId);
    if (lesson?.isPreview) return { ok: true, video };
  }

  if (!actingUser) {
    return { ok: false, status: 401 };
  }

  if (await EnrollmentService.isEnrolled(actingUser.id, video.courseId)) {
    return { ok: true, video };
  }

  const managing = await requireOwnCourseAccess(actingUser, video.courseId);
  if (managing.ok) return { ok: true, video };

  return { ok: false, status: 403 };
}

function requireStorage(): StorageProvider {
  const storage = getMediaStorage();
  if (!storage) throw new Error("Video storage is not configured.");
  return storage;
}

/**
 * The master playlist passes through as-is: its variant references are
 * relative (`720p/index.m3u8`), and relative resolution against the API
 * route's own URL lands the next request back on the API — which is
 * exactly the authorization funnel we want.
 */
export async function getMasterPlaylist(video: Video): Promise<string | null> {
  if (!video.manifestKey) return null;
  const bytes = await requireStorage().getObject(video.manifestKey);
  return new TextDecoder().decode(bytes);
}

/**
 * The variant playlist is where the bytes escape to storage: every
 * segment line is rewritten into a presigned GET URL pointing directly
 * at the object store. The Next.js server serves ~KBs of text; the GBs
 * of video never touch it.
 */
export async function getRenditionPlaylist(video: Video, height: number): Promise<string | null> {
  const rendition = video.metadata.renditions?.find((entry) => entry.height === height);
  if (!rendition) return null;
  const storage = requireStorage();
  const raw = new TextDecoder().decode(await storage.getObject(rendition.playlistKey));
  const ttl = segmentTtlSeconds();

  const lines = await Promise.all(
    raw.split("\n").map(async (line) => {
      const trimmed = line.trim();
      if (trimmed === "" || trimmed.startsWith("#")) return line;
      // A segment reference. Only sign plain relative file names — anything
      // else in a playlist we generated ourselves is unexpected.
      if (trimmed.includes("/") || trimmed.includes(":")) {
        logger.warn(`[video-playback] unexpected playlist line skipped for video ${video.id}`);
        return line;
      }
      return storage.createSignedDownloadUrl(videoRenditionSegmentKey(video.id, height, trimmed), ttl);
    }),
  );
  return lines.join("\n");
}

/** Fallback when FFmpeg was unavailable (`processingStatus: "skipped"`):
 *  stream the original file straight from storage via one signed URL. */
export async function getSourceRedirectUrl(video: Video): Promise<string> {
  return requireStorage().createSignedDownloadUrl(video.storageKey, segmentTtlSeconds());
}

export async function getImageRedirectUrl(
  video: Video,
  kind: "thumbnail" | "preview",
): Promise<string | null> {
  const key = kind === "thumbnail" ? video.thumbnailKey : video.previewKey;
  if (!key) return null;
  return requireStorage().createSignedDownloadUrl(key, IMAGE_URL_TTL_SECONDS);
}
