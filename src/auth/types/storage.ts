/**
 * Port for file storage — implemented today by
 * `auth/repositories/avatar-storage.repository.ts` (Supabase Storage).
 * Swapping providers (S3, Cloudinary, ...) later means writing one new
 * adapter behind this same interface; `ProfileService.uploadAvatar` and
 * everything above it never changes.
 */
export interface StorageUploadInput {
  bucket: string;
  path: string;
  file: Blob;
  contentType?: string;
}

export interface StorageProvider {
  upload(input: StorageUploadInput): Promise<{ path: string }>;
  remove(bucket: string, path: string): Promise<void>;
  getPublicUrl(bucket: string, path: string): string;
}
