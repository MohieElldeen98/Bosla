/**
 * Provider-agnostic contract for the video object store. Everything above
 * this layer (upload actions, processing pipeline, playback signing)
 * speaks only these types — swapping Cloudflare R2 for AWS S3 (or MinIO,
 * Backblaze B2, …) means adding a provider entry in `storage/index.ts`,
 * never touching callers. Deliberately separate from the CMS media
 * pipeline (Supabase storage): course videos need multipart resumable
 * uploads and per-segment signed HLS playback that Supabase's public
 * bucket model doesn't provide.
 */

/** An in-flight multipart upload the client resumes against. */
export interface MultipartUpload {
  uploadId: string;
  key: string;
}

/** One completed chunk, echoed back verbatim at completion time. */
export interface CompletedPart {
  partNumber: number;
  etag: string;
}

export interface SignedPartUrl {
  partNumber: number;
  url: string;
}

export interface HeadResult {
  size: number;
  contentType: string | null;
  lastModified: Date | null;
}

export interface StorageProvider {
  /** Human-readable id ("r2", "s3") — surfaces in docs/status endpoints only. */
  readonly name: string;

  /** Begin a multipart upload for `key`; the returned `uploadId` is the
   *  resume token the browser persists across interruptions. */
  createUpload(key: string, contentType: string): Promise<MultipartUpload>;

  /** Presign PUT URLs for the given part numbers of an open multipart
   *  upload. Parts are signed in batches on demand so a 2GB+ upload never
   *  needs thousands of URLs minted up front. */
  createSignedPartUrls(
    key: string,
    uploadId: string,
    partNumbers: number[],
    expiresInSeconds: number,
  ): Promise<SignedPartUrl[]>;

  /** Stitch the uploaded parts into the final object. */
  completeUpload(key: string, uploadId: string, parts: CompletedPart[]): Promise<void>;

  /** Discard an abandoned/cancelled multipart upload so the provider
   *  doesn't bill for orphaned parts. */
  abortUpload(key: string, uploadId: string): Promise<void>;

  /** Single-request presigned PUT — used by the processing pipeline to
   *  push generated artifacts (playlists, segments, thumbnails), never by
   *  the browser (which always goes multipart). */
  createSignedUploadUrl(key: string, contentType: string, expiresInSeconds: number): Promise<string>;

  /** Short-lived presigned GET — the only way playback URLs are ever
   *  produced; permanent URLs must not exist. */
  createSignedDownloadUrl(key: string, expiresInSeconds: number): Promise<string>;

  /** Fetch object bytes server-side (playlist rewriting, pipeline source
   *  download). Small objects only in request paths — video bytes must
   *  never flow through the Next.js server on a user request. */
  getObject(key: string): Promise<Uint8Array>;

  putObject(key: string, body: Uint8Array, contentType: string): Promise<void>;

  delete(key: string): Promise<void>;

  /** Delete every object under a prefix (a video's whole folder). */
  deletePrefix(prefix: string): Promise<void>;

  head(key: string): Promise<HeadResult | null>;
}

export interface MediaStorageConfig {
  provider: "r2" | "s3";
  bucket: string;
  region: string;
  /** Required for R2 (`https://<account>.r2.cloudflarestorage.com`) and
   *  any other S3-compatible store; omitted for AWS S3 itself. */
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
}
