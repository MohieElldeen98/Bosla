import "server-only";

import { logger } from "@/lib/logger";
import { requireOwnCourseAccess } from "@/learning/utils/require-own-course-access";
import { getMediaQueue } from "@/media/queue";
import { getMediaStorage } from "@/media/storage";
import { VideoRepository } from "@/video/repositories/video.repository";
import { videoSourceKey } from "@/video/utils/storage-keys";
import { UPLOAD_PART_SIZE_BYTES, type Video, type VideoUploadSession } from "@/video/types/video";
import type {
  AbortVideoUploadInput,
  CompleteVideoUploadInput,
  CreateVideoUploadInput,
  SignVideoUploadPartsInput,
} from "@/video/validators/video.validator";
import type { SignedPartUrl } from "@/media/storage/types";
import type { VideoActionResult } from "@/video/types/result";
import type { AuthUser } from "@/auth/types/session";

/** Part URLs outlive flaky networks but not a leaked browser tab. */
const PART_URL_TTL_SECONDS = 60 * 60;

const NOT_CONFIGURED: VideoActionResult<never> = {
  success: false,
  code: "not_configured",
  message: "Video storage is not configured on this deployment yet.",
};

/**
 * Resolve the video AND prove the acting user may touch it — ownership is
 * re-checked on every step of the multipart conversation (sign/complete/
 * abort), never trusted from step one: the signed part URLs are the only
 * capability the browser holds, and each new batch must be re-earned.
 */
async function requireOwnUploadingVideo(
  actingUser: AuthUser,
  videoId: string,
): Promise<VideoActionResult<Video>> {
  const video = await VideoRepository.findById(videoId);
  if (!video || video.status !== "uploading" || !video.uploadId) {
    return { success: false, code: "not_found", message: "No open upload found for this video." };
  }
  const access = await requireOwnCourseAccess(actingUser, video.courseId);
  if (!access.ok) {
    return { success: false, code: "forbidden", message: access.message };
  }
  return { success: true, data: video };
}

/**
 * Orchestrates the browser-direct multipart upload conversation (Phase 2):
 * create → sign parts (batched, on demand) → complete/abort. Video bytes
 * never touch this server — the browser PUTs each chunk straight to the
 * object store with the URLs minted here. Authorization reuses
 * `requireOwnCourseAccess`, the same gate every curriculum mutation
 * already passes through; `requireDraft` binds creation only (matching
 * the curriculum freeze rule) — an upload already in flight may finish
 * even if the course was submitted for review mid-upload.
 */
export const VideoUploadService = {
  async createUpload(
    actingUser: AuthUser,
    input: CreateVideoUploadInput,
  ): Promise<VideoActionResult<VideoUploadSession>> {
    const storage = getMediaStorage();
    if (!storage) return NOT_CONFIGURED;

    const access = await requireOwnCourseAccess(actingUser, input.courseId, { requireDraft: true });
    if (!access.ok) {
      return { success: false, code: "forbidden", message: access.message };
    }

    try {
      // The row id doubles as the storage folder name, so insert first
      // with a placeholder key, then start the multipart upload and fill
      // the real key + uploadId in.
      const video = await VideoRepository.create({
        title: input.title,
        courseId: input.courseId,
        lessonId: input.lessonId ?? null,
        storageKey: "pending",
        size: input.size,
        mimeType: input.mimeType,
        uploadId: "pending",
        uploadedBy: actingUser.id,
        metadata: { originalFileName: input.fileName },
      });
      const key = videoSourceKey(video.id, input.fileName);
      const upload = await storage.createUpload(key, input.mimeType);
      const updated = await VideoRepository.update(video.id, {
        storageKey: key,
        uploadId: upload.uploadId,
      });
      if (!updated) {
        return { success: false, code: "unknown", message: "Could not persist the upload session." };
      }
      return {
        success: true,
        data: {
          videoId: video.id,
          partSize: UPLOAD_PART_SIZE_BYTES,
          partCount: Math.max(1, Math.ceil(input.size / UPLOAD_PART_SIZE_BYTES)),
        },
      };
    } catch (error) {
      logger.error("[video] createUpload failed:", error);
      return { success: false, code: "unknown", message: "Could not start the upload. Try again." };
    }
  },

  async signParts(
    actingUser: AuthUser,
    input: SignVideoUploadPartsInput,
  ): Promise<VideoActionResult<SignedPartUrl[]>> {
    const storage = getMediaStorage();
    if (!storage) return NOT_CONFIGURED;
    const owned = await requireOwnUploadingVideo(actingUser, input.videoId);
    if (!owned.success) return owned;
    try {
      const urls = await storage.createSignedPartUrls(
        owned.data.storageKey,
        owned.data.uploadId!,
        input.partNumbers,
        PART_URL_TTL_SECONDS,
      );
      return { success: true, data: urls };
    } catch (error) {
      logger.error("[video] signParts failed:", error);
      return { success: false, code: "unknown", message: "Could not sign upload URLs. Try again." };
    }
  },

  async completeUpload(
    actingUser: AuthUser,
    input: CompleteVideoUploadInput,
  ): Promise<VideoActionResult<Video>> {
    const storage = getMediaStorage();
    if (!storage) return NOT_CONFIGURED;
    const owned = await requireOwnUploadingVideo(actingUser, input.videoId);
    if (!owned.success) return owned;
    const video = owned.data;
    try {
      await storage.completeUpload(video.storageKey, video.uploadId!, input.parts);
      // Trust the store, not the client, for the final byte count.
      const head = await storage.head(video.storageKey);
      const updated = await VideoRepository.update(video.id, {
        status: "processing",
        processingStatus: "pending",
        size: head?.size ?? video.size,
        uploadId: null,
      });
      if (!updated) {
        return { success: false, code: "unknown", message: "Upload finished but could not be recorded." };
      }
      await getMediaQueue().enqueue({ name: "video.process", payload: { videoId: video.id } });
      return { success: true, data: updated };
    } catch (error) {
      logger.error("[video] completeUpload failed:", error);
      return {
        success: false,
        code: "unknown",
        message: "Could not finalize the upload. Resume and try again.",
      };
    }
  },

  async abortUpload(
    actingUser: AuthUser,
    input: AbortVideoUploadInput,
  ): Promise<VideoActionResult> {
    const storage = getMediaStorage();
    if (!storage) return NOT_CONFIGURED;
    const owned = await requireOwnUploadingVideo(actingUser, input.videoId);
    if (!owned.success) return owned;
    try {
      await storage.abortUpload(owned.data.storageKey, owned.data.uploadId!);
      await VideoRepository.delete(owned.data.id);
      return { success: true, data: undefined };
    } catch (error) {
      logger.error("[video] abortUpload failed:", error);
      return { success: false, code: "unknown", message: "Could not cancel the upload." };
    }
  },

  /**
   * Attach an already-uploaded (or still-uploading) video to a lesson —
   * the "add lesson" flow uploads with `lessonId: null` while the lesson
   * doesn't exist yet, then calls this right after the lesson row is
   * created. The lesson must belong to the same course the video was
   * uploaded to; ownership is the same `requireOwnCourseAccess` gate.
   */
  async attachToLesson(
    actingUser: AuthUser,
    input: { videoId: string; lessonId: string },
  ): Promise<VideoActionResult<Video>> {
    const video = await VideoRepository.findById(input.videoId);
    if (!video) {
      return { success: false, code: "not_found", message: "Video not found." };
    }
    const access = await requireOwnCourseAccess(actingUser, video.courseId);
    if (!access.ok) {
      return { success: false, code: "forbidden", message: access.message };
    }
    const { LessonService } = await import("@/learning/services/lesson.service");
    const { ModuleService } = await import("@/learning/services/module.service");
    const lesson = await LessonService.getById(input.lessonId);
    const parentModule = lesson ? await ModuleService.getById(lesson.moduleId) : null;
    if (!lesson || !parentModule || parentModule.courseId !== video.courseId) {
      return { success: false, code: "not_found", message: "Lesson not found in this course." };
    }
    const updated = await VideoRepository.update(video.id, { lessonId: lesson.id });
    if (!updated) {
      return { success: false, code: "unknown", message: "Could not attach the video." };
    }
    // If processing already finished before the lesson existed, the
    // pipeline couldn't sync the duration — do it here instead.
    if (updated.duration && updated.duration > 0) {
      const { LessonRepository } = await import("@/learning/repositories/lesson.repository");
      await LessonRepository.update(lesson.id, { durationSeconds: updated.duration }).catch(
        () => undefined,
      );
    }
    return { success: true, data: updated };
  },

  /** Polling read for the upload/processing UI — ownership-gated like
   *  every other method, but without the `uploading`-status requirement. */
  async getOwnVideo(actingUser: AuthUser, videoId: string): Promise<VideoActionResult<Video>> {
    const video = await VideoRepository.findById(videoId);
    if (!video) {
      return { success: false, code: "not_found", message: "Video not found." };
    }
    const access = await requireOwnCourseAccess(actingUser, video.courseId);
    if (!access.ok) {
      return { success: false, code: "forbidden", message: access.message };
    }
    return { success: true, data: video };
  },

  async getLatestForLesson(
    actingUser: AuthUser,
    courseId: string,
    lessonId: string,
  ): Promise<VideoActionResult<Video | null>> {
    const access = await requireOwnCourseAccess(actingUser, courseId);
    if (!access.ok) {
      return { success: false, code: "forbidden", message: access.message };
    }
    const video = await VideoRepository.findLatestByLessonId(lessonId);
    return { success: true, data: video && video.courseId === courseId ? video : null };
  },
};
