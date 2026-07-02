export const AVATAR_BUCKET = "avatars";

/** Deterministic, collision-free, and overwrite-friendly (`upsert: true` in
 *  the repository) — a user always has exactly one object at this path,
 *  so re-uploading replaces it rather than accumulating orphaned files. */
export function getAvatarStoragePath(userId: string, fileExtension: string): string {
  return `${userId}/avatar.${fileExtension}`;
}
