import { z } from "zod";
import { optionalLocalizedTextSchema, localizedTextSchema } from "@/cms/validators/content-blocks.validator";
import { MEDIA_FILE_TYPES } from "@/cms/types/media-library";
import { MEDIA_SORT_DIRECTIONS, MEDIA_SORT_FIELDS } from "@/cms/types/media-search";

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
