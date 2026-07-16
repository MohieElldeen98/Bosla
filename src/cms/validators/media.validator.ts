import { z } from "zod";
import { optionalLocalizedTextSchema, localizedTextSchema } from "@/cms/validators/content-blocks.validator";
import { MEDIA_FILE_TYPES } from "@/cms/types/media-library";
import { MEDIA_SORT_DIRECTIONS, MEDIA_SORT_FIELDS } from "@/cms/types/media-search";
import { MEDIA_ACCEPTED_MIME_TYPES, MEDIA_MAX_FILE_SIZE_BYTES } from "@/cms/constants/storage";

/** The metadata fields an admin can set on any asset, upload-time or
 *  later — never the file/URL/dimensions themselves, which only ever
 *  come from the actual upload (`MediaLibraryService.upload`), never a
 *  form field a client could spoof. */
const mediaMetadataFields = z.object({
  alt: optionalLocalizedTextSchema,
  title: optionalLocalizedTextSchema,
  caption: optionalLocalizedTextSchema,
  description: optionalLocalizedTextSchema,
  tags: z.array(z.string().trim().min(1).max(48)).max(20).default([]),
  folder: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .nullable()
    .optional(),
});

/** Upload-time metadata — optional, an admin can fill it in after. */
export const uploadMediaMetadataSchema = mediaMetadataFields.partial();
export type UploadMediaMetadataInput = z.infer<typeof uploadMediaMetadataSchema>;

export const createMediaUploadUrlSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.enum(MEDIA_ACCEPTED_MIME_TYPES as [string, ...string[]]),
  fileSize: z.number().int().positive().max(MEDIA_MAX_FILE_SIZE_BYTES),
});
export type CreateMediaUploadUrlInput = z.infer<typeof createMediaUploadUrlSchema>;

export const registerMediaUploadSchema = z.object({
  assetId: z.string().uuid(),
  storagePath: z.string().trim().min(1),
  fileName: z.string().trim().min(1).max(255).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  // A ~24px blur preview is well under 2KB as a data URL; the cap exists
  // so the column can never be abused as arbitrary-blob storage.
  placeholder: z.string().max(12_000).nullable().optional(),
  metadata: uploadMediaMetadataSchema.optional(),
});
export type RegisterMediaUploadInput = z.infer<typeof registerMediaUploadSchema>;

export const updateMediaAssetSchema = mediaMetadataFields.partial();
export type UpdateMediaAssetInput = z.infer<typeof updateMediaAssetSchema>;

/** "Rename" per this step's own scope — an asset's `title` doubles as
 *  its display name; renaming never touches `storagePath`/`url` (the
 *  underlying Storage object keeps its original key), matching
 *  `updateOwnCouponSchema`'s "some fields are create-only" precedent
 *  for why this stays a thin, single-field wrapper around `update`
 *  rather than a real Storage move/copy operation. */
export const renameMediaAssetSchema = z.object({ title: localizedTextSchema });
export type RenameMediaAssetInput = z.infer<typeof renameMediaAssetSchema>;

/** Parses the admin Media Library's URL search params. */
export const searchMediaSchema = z.object({
  query: z.string().trim().min(1).optional(),
  fileType: z.enum(MEDIA_FILE_TYPES).optional(),
  folder: z.string().trim().min(1).optional(),
  tag: z.string().trim().min(1).optional(),
  sortBy: z.enum(MEDIA_SORT_FIELDS).optional(),
  sortDirection: z.enum(MEDIA_SORT_DIRECTIONS).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
export type SearchMediaInput = z.infer<typeof searchMediaSchema>;
