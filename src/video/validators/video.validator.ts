import { z } from "zod";
import {
  ALLOWED_VIDEO_MIME_TYPES,
  MAX_SIGNED_PARTS_PER_REQUEST,
  MAX_VIDEO_SIZE_BYTES,
} from "@/video/types/video";

export const createVideoUploadSchema = z.object({
  courseId: z.string().uuid("A valid course id is required."),
  lessonId: z.string().uuid("A valid lesson id is required.").nullable().optional(),
  title: z.string().trim().min(1, "A title is required.").max(200, "Title is too long."),
  fileName: z.string().trim().min(1).max(300),
  size: z
    .number()
    .int()
    .positive("File is empty.")
    .max(MAX_VIDEO_SIZE_BYTES, "File exceeds the 8 GB upload limit."),
  mimeType: z.enum(ALLOWED_VIDEO_MIME_TYPES, {
    message: "Unsupported video format. Upload MP4, MOV, WebM, MKV, or AVI.",
  }),
});

export const signVideoUploadPartsSchema = z.object({
  videoId: z.string().uuid(),
  partNumbers: z
    .array(z.number().int().min(1).max(10000))
    .min(1)
    .max(MAX_SIGNED_PARTS_PER_REQUEST, "Too many parts requested at once."),
});

export const completeVideoUploadSchema = z.object({
  videoId: z.string().uuid(),
  parts: z
    .array(
      z.object({
        partNumber: z.number().int().min(1).max(10000),
        etag: z.string().min(1).max(200),
      }),
    )
    .min(1)
    .max(10000),
});

export const abortVideoUploadSchema = z.object({
  videoId: z.string().uuid(),
});

export const attachVideoToLessonSchema = z.object({
  videoId: z.string().uuid(),
  lessonId: z.string().uuid(),
});

export type CreateVideoUploadInput = z.infer<typeof createVideoUploadSchema>;
export type SignVideoUploadPartsInput = z.infer<typeof signVideoUploadPartsSchema>;
export type CompleteVideoUploadInput = z.infer<typeof completeVideoUploadSchema>;
export type AbortVideoUploadInput = z.infer<typeof abortVideoUploadSchema>;
