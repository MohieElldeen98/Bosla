/**
 * Every key a video ever writes lives under one `videos/<id>/` folder, so
 * deleting a video is one `deletePrefix` and nothing can orphan. Shared
 * between the upload service (source key) and the processing pipeline
 * (artifact keys) — the DB stores whatever these return; nothing else in
 * the codebase constructs video keys by hand.
 */

export function videoPrefix(videoId: string): string {
  return `videos/${videoId}/`;
}

export function videoSourceKey(videoId: string, fileName: string): string {
  // Keep only a safe ASCII slug of the original name — the real name is
  // preserved in `metadata.originalFileName`; the key must survive URL
  // signing and FFmpeg CLI args untouched.
  const extension = fileName.includes(".") ? fileName.split(".").pop()!.toLowerCase() : "bin";
  const safeExtension = /^[a-z0-9]{1,8}$/.test(extension) ? extension : "bin";
  return `${videoPrefix(videoId)}source/original.${safeExtension}`;
}

export function videoMasterPlaylistKey(videoId: string): string {
  return `${videoPrefix(videoId)}hls/master.m3u8`;
}

export function videoRenditionPlaylistKey(videoId: string, height: number): string {
  return `${videoPrefix(videoId)}hls/${height}p/index.m3u8`;
}

export function videoRenditionSegmentKey(videoId: string, height: number, segmentFile: string): string {
  return `${videoPrefix(videoId)}hls/${height}p/${segmentFile}`;
}

export function videoThumbnailKey(videoId: string): string {
  return `${videoPrefix(videoId)}thumbnail.jpg`;
}

export function videoPreviewKey(videoId: string): string {
  return `${videoPrefix(videoId)}preview.jpg`;
}
