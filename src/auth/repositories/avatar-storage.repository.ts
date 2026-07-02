import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import type { StorageProvider, StorageUploadInput } from "@/auth/types/storage";

/**
 * Supabase Storage adapter — implements `StorageProvider` so a future
 * provider swap (S3, Cloudinary, ...) means writing one new adapter behind
 * this same interface; `ProfileService.uploadAvatar` and everything above
 * it never changes. No uploader UI exists yet — this is the abstraction
 * only, ready for one.
 */
export const SupabaseAvatarStorage: StorageProvider = {
  async upload({ bucket, path, file, contentType }: StorageUploadInput) {
    const supabase = await createClient();
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType,
      upsert: true,
    });
    if (error) throw error;
    return { path: data.path };
  },

  async remove(bucket: string, path: string) {
    const supabase = await createClient();
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
  },

  /**
   * Pure string construction, deliberately not going through the Supabase
   * SDK: a public bucket's URL is fully determined by the project URL,
   * bucket, and path, so this stays synchronous — the SDK's own
   * `getPublicUrl` would require an async client for no benefit here.
   */
  getPublicUrl(bucket: string, path: string) {
    const base = env?.NEXT_PUBLIC_SUPABASE_URL ?? "";
    return `${base}/storage/v1/object/public/${bucket}/${path}`;
  },
};
