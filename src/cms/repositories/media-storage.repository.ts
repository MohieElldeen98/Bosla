import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import type { StorageProvider } from "@/auth/types/storage";

/**
 * Supabase Storage adapter for the Media Library's `media` bucket.
 * Browser uploads use signed URLs; this adapter remains responsible for
 * server-side cleanup and public URL construction.
 */
export const SupabaseMediaStorage: Pick<StorageProvider, "remove" | "getPublicUrl"> = {
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
