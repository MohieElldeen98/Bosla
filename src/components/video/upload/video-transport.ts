"use client";

import {
  abortVideoUploadAction,
  completeVideoUploadAction,
  createVideoUploadAction,
  signVideoUploadPartsAction,
} from "@/video/actions/video.actions";
import type { CreatedUploadSession, UploadTransport } from "@/media/upload/engine";

/**
 * The lesson-video transport — always multipart (lecture files are
 * large), with the provider `uploadId` kept server-side on the `videos`
 * row (so `uploadId` is `null` here and the signing action resolves it
 * by ownership). Everything else — chunking, resume, retry, progress —
 * is the shared engine's.
 */
export function createVideoTransport(options: {
  courseId: string;
  lessonId: string | null;
}): UploadTransport {
  return {
    sessionScope: `video:${options.courseId}`,

    async create(file, title): Promise<CreatedUploadSession> {
      const result = await createVideoUploadAction({
        courseId: options.courseId,
        lessonId: options.lessonId,
        title,
        fileName: file.name,
        size: file.size,
        mimeType: file.type || "video/mp4",
      });
      if (!result.success) throw new Error(result.message);
      return {
        kind: "multipart",
        remoteId: result.data.videoId,
        partSize: result.data.partSize,
        uploadId: null,
      };
    },

    async signParts(remoteId, _uploadId, partNumbers) {
      const result = await signVideoUploadPartsAction({ videoId: remoteId, partNumbers });
      if (!result.success) throw new Error(result.message);
      return result.data;
    },

    async complete(remoteId, _uploadId, parts) {
      if (!parts) throw new Error("Missing multipart parts.");
      const result = await completeVideoUploadAction({ videoId: remoteId, parts });
      if (!result.success) throw new Error(result.message);
    },

    async abort(remoteId) {
      await abortVideoUploadAction({ videoId: remoteId });
    },
  };
}
