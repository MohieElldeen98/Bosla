import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  CompletedPart,
  HeadResult,
  MultipartUpload,
  SignedPartUrl,
  StorageProvider,
  MediaStorageConfig,
} from "./types";

/**
 * One implementation covers both configured providers: Cloudflare R2 is
 * wire-compatible with the S3 API, so "R2 vs AWS S3" is purely a config
 * difference (custom `endpoint` + `region: "auto"` for R2). The
 * `StorageProvider` interface still exists above this class because the
 * *next* provider (Bunny Stream, GCS, Supabase storage) won't be
 * S3-shaped — callers must stay coupled to the interface, not to this.
 */
export class S3CompatibleStorageProvider implements StorageProvider {
  readonly name: string;
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: MediaStorageConfig) {
    this.name = config.provider;
    this.bucket = config.bucket;
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      // R2 requires path-style-off default is fine; R2 works with virtual
      // hosted style via the account endpoint. forcePathStyle stays off.
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async createUpload(key: string, contentType: string): Promise<MultipartUpload> {
    const result = await this.client.send(
      new CreateMultipartUploadCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
    );
    if (!result.UploadId) throw new Error("Storage provider did not return an upload id.");
    return { uploadId: result.UploadId, key };
  }

  async createSignedPartUrls(
    key: string,
    uploadId: string,
    partNumbers: number[],
    expiresInSeconds: number,
  ): Promise<SignedPartUrl[]> {
    return Promise.all(
      partNumbers.map(async (partNumber) => ({
        partNumber,
        url: await getSignedUrl(
          this.client,
          new UploadPartCommand({
            Bucket: this.bucket,
            Key: key,
            UploadId: uploadId,
            PartNumber: partNumber,
          }),
          { expiresIn: expiresInSeconds },
        ),
      })),
    );
  }

  async completeUpload(key: string, uploadId: string, parts: CompletedPart[]): Promise<void> {
    await this.client.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: [...parts]
            .sort((a, b) => a.partNumber - b.partNumber)
            .map((part) => ({ PartNumber: part.partNumber, ETag: part.etag })),
        },
      }),
    );
  }

  async abortUpload(key: string, uploadId: string): Promise<void> {
    await this.client.send(
      new AbortMultipartUploadCommand({ Bucket: this.bucket, Key: key, UploadId: uploadId }),
    );
  }

  async createSignedUploadUrl(key: string, contentType: string, expiresInSeconds: number): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn: expiresInSeconds },
    );
  }

  async createSignedDownloadUrl(key: string, expiresInSeconds: number): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: expiresInSeconds,
    });
  }

  async getObject(key: string): Promise<Uint8Array> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!result.Body) throw new Error(`Object "${key}" has no body.`);
    return result.Body.transformToByteArray();
  }

  async putObject(key: string, body: Uint8Array, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async deletePrefix(prefix: string): Promise<void> {
    // Page through the listing — a processed video's folder holds hundreds
    // of segments, and DeleteObjects caps at 1000 keys per call.
    let continuationToken: string | undefined;
    do {
      const listed = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
      const keys = (listed.Contents ?? [])
        .map((object) => object.Key)
        .filter((key): key is string => Boolean(key));
      if (keys.length > 0) {
        await this.client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: keys.map((key) => ({ Key: key })) },
          }),
        );
      }
      continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
    } while (continuationToken);
  }

  async head(key: string): Promise<HeadResult | null> {
    try {
      const result = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return {
        size: result.ContentLength ?? 0,
        contentType: result.ContentType ?? null,
        lastModified: result.LastModified ?? null,
      };
    } catch (error) {
      if (error instanceof Error && (error.name === "NotFound" || error.name === "NoSuchKey")) {
        return null;
      }
      throw error;
    }
  }
}
