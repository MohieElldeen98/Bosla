import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import type { StorageProvider, StorageUploadInput } from "@/auth/types/storage";

/**
 * Supabase Storage adapter for the Media Library's `media` bucket —
 * implements the same `StorageProvider` port `auth/repositories/
 * avatar-storage.repository.ts`'s `SupabaseAvatarStorage` already
 * implements for `avatars`, reused as-is rather than duplicated (the
 * interface was already bucket-agnostic; only the bucket name differs
 * per call site). A provider swap later (S3, Cloudinary, ...) means
 * writing one new adapter behind this same port, same as the avatar
 * case — `MediaLibraryService` and everything above it never changes.
 */
export const SupabaseMediaStorage: StorageProvider = {
  async upload({ bucket, path, file, contentType }: StorageUploadInput) {
    const supabase = await createClient();
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType,
      upsert: false,
    });
    if (error) throw error;
    return { path: data.path };
  },

  async remove(bucket: string, path: string) {
    const supabase = await createClient();
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
  },

  getPublicUrl(bucket: string, path: string) {
    const base = env?.NEXT_PUBLIC_SUPABASE_URL ?? "";
    return `${base}/storage/v1/object/public/${bucket}/${path}`;
  },
};
