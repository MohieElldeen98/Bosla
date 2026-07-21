import { z } from "zod";
import { MEDIA_ACCEPTED_MIME_TYPES } from "@/media/constants/mime";
import { MEDIA_VISIBILITIES } from "@/media/types/media-platform";
import { uploadMediaMetadataSchema } from "@/cms/validators/media.validator";

export const createMediaUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.enum(MEDIA_ACCEPTED_MIME_TYPES as [string, ...string[]], {
    message: "Unsupported file type.",
  }),
  // The per-category cap is enforced in the service (it depends on the
  // resolved category); this is just a sanity ceiling.
  fileSize: z.number().int().positive().max(2 * 1024 * 1024 * 1024),
  visibility: z.enum(MEDIA_VISIBILITIES).default("public"),
  relatedEntity: z.string().trim().min(1).max(40).nullable().optional(),
  relatedEntityId: z.string().uuid().nullable().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  placeholder: z.string().max(12_000).nullable().optional(),
  metadata: uploadMediaMetadataSchema.optional(),
  /** Re-dropping a file the caller already owns returns the existing
   *  asset (`mode: "duplicate"`) unless this opts out. */
  allowDuplicate: z.boolean().default(false),
  /** Replace-in-place: upload new bytes under an EXISTING asset id so
   *  every reference to it keeps working. Skips duplicate detection. */
  replaceAssetId: z.string().uuid().optional(),
});

export const signMediaUploadPartsSchema = z.object({
  assetId: z.string().uuid(),
  uploadId: z.string().min(1).max(2048),
  partNumbers: z.array(z.number().int().min(1).max(10000)).min(1).max(20),
});

export const completeMediaUploadSchema = z.object({
  assetId: z.string().uuid(),
  multipart: z
    .object({
      uploadId: z.string().min(1).max(2048),
      parts: z
        .array(z.object({ partNumber: z.number().int().min(1).max(10000), etag: z.string().min(1).max(200) }))
        .min(1)
        .max(10000),
    })
    .optional(),
});

export const abortMediaUploadSchema = z.object({
  assetId: z.string().uuid(),
  uploadId: z.string().min(1).max(2048).optional(),
});

export type CreateMediaUploadInput = z.infer<typeof createMediaUploadSchema>;
export type SignMediaUploadPartsInput = z.infer<typeof signMediaUploadPartsSchema>;
export type CompleteMediaUploadInput = z.infer<typeof completeMediaUploadSchema>;
export type AbortMediaUploadInput = z.infer<typeof abortMediaUploadSchema>;
