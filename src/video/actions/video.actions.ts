"use server";

import { SessionService } from "@/auth/services/session.service";
import { VideoUploadService } from "@/video/services/video-upload.service";
import {
  abortVideoUploadSchema,
  attachVideoToLessonSchema,
  completeVideoUploadSchema,
  createVideoUploadSchema,
  signVideoUploadPartsSchema,
} from "@/video/validators/video.validator";
import type { SignedPartUrl } from "@/media/storage/types";
import type { VideoActionResult } from "@/video/types/result";
import type { Video, VideoUploadSession } from "@/video/types/video";

/**
 * The Video domain's server-action surface — thin: session + zod parse,
 * then straight into `VideoUploadService`, which owns all authorization
 * (mirrors how `cms/actions/media.actions.ts` fronts `CmsMediaService`).
 */

const SIGNED_OUT: VideoActionResult<never> = {
  success: false,
  code: "forbidden",
  message: "You must be signed in.",
};

function validationFailed(issues: { message: string }[]): VideoActionResult<never> {
  return {
    success: false,
    code: "validation_failed",
    message: issues.map((issue) => issue.message).join(" "),
  };
}

export async function createVideoUploadAction(
  rawInput: unknown,
): Promise<VideoActionResult<VideoUploadSession>> {
  const user = await SessionService.getCurrentUser();
  if (!user) return SIGNED_OUT;
  const parsed = createVideoUploadSchema.safeParse(rawInput);
  if (!parsed.success) return validationFailed(parsed.error.issues);
  return VideoUploadService.createUpload(user, parsed.data);
}

export async function signVideoUploadPartsAction(
  rawInput: unknown,
): Promise<VideoActionResult<SignedPartUrl[]>> {
  const user = await SessionService.getCurrentUser();
  if (!user) return SIGNED_OUT;
  const parsed = signVideoUploadPartsSchema.safeParse(rawInput);
  if (!parsed.success) return validationFailed(parsed.error.issues);
  return VideoUploadService.signParts(user, parsed.data);
}

export async function completeVideoUploadAction(
  rawInput: unknown,
): Promise<VideoActionResult<Video>> {
  const user = await SessionService.getCurrentUser();
  if (!user) return SIGNED_OUT;
  const parsed = completeVideoUploadSchema.safeParse(rawInput);
  if (!parsed.success) return validationFailed(parsed.error.issues);
  return VideoUploadService.completeUpload(user, parsed.data);
}

export async function abortVideoUploadAction(rawInput: unknown): Promise<VideoActionResult> {
  const user = await SessionService.getCurrentUser();
  if (!user) return SIGNED_OUT;
  const parsed = abortVideoUploadSchema.safeParse(rawInput);
  if (!parsed.success) return validationFailed(parsed.error.issues);
  return VideoUploadService.abortUpload(user, parsed.data);
}

/** Attach an uploaded video to a just-created lesson (the "add lesson"
 *  flow uploads before the lesson row exists — see
 *  `VideoUploadService.attachToLesson`). */
export async function attachVideoToLessonAction(
  rawInput: unknown,
): Promise<VideoActionResult<Video>> {
  const user = await SessionService.getCurrentUser();
  if (!user) return SIGNED_OUT;
  const parsed = attachVideoToLessonSchema.safeParse(rawInput);
  if (!parsed.success) return validationFailed(parsed.error.issues);
  return VideoUploadService.attachToLesson(user, parsed.data);
}

/** Polling read for processing state after an upload completes. */
export async function getVideoStatusAction(videoId: string): Promise<VideoActionResult<Video>> {
  const user = await SessionService.getCurrentUser();
  if (!user) return SIGNED_OUT;
  return VideoUploadService.getOwnVideo(user, videoId);
}

export async function getLessonVideoAction(
  courseId: string,
  lessonId: string,
): Promise<VideoActionResult<Video | null>> {
  const user = await SessionService.getCurrentUser();
  if (!user) return SIGNED_OUT;
  return VideoUploadService.getLatestForLesson(user, courseId, lessonId);
}

/** Lets the upload UI render its "not configured" placeholder without
 *  attempting an upload first. */
export async function isVideoStorageConfiguredAction(): Promise<boolean> {
  const { getMediaStorage } = await import("@/media/storage");
  return getMediaStorage() !== null;
}
