"use client";

/**
 * The ONE browser upload engine for all of Bosla (docs/media-platform.md
 * "Upload experience"). tus-style resumable semantics — chunked,
 * pausable, survives page reloads, retries with backoff, per-file
 * progress/speed/ETA — implemented over presigned URLs so bytes go
 * browser → object storage directly; the Next.js server only ever mints
 * URLs.
 *
 * What kind of upload happens is the transport's business, not the
 * engine's: the media transport returns single-PUT sessions for small
 * files and multipart for large ones; the video transport is always
 * multipart. Both feed the same state machine, so there is exactly one
 * implementation of pause/resume/retry/persistence in the codebase.
 */

import type { CompletedPart, SignedPartUrl } from "@/media/storage/types";

export type UploadState =
  | "queued"
  | "starting"
  | "uploading"
  | "paused"
  | "completing"
  | "processing"
  | "ready"
  | "error"
  | "canceled";

export interface UploadSnapshot {
  id: string;
  fileName: string;
  title: string;
  state: UploadState;
  uploadedBytes: number;
  totalBytes: number;
  /** 0–100, of the byte transfer only (processing has its own state). */
  percent: number;
  /** Bytes per second over a rolling window; 0 while paused/stalled. */
  speedBps: number;
  /** Seconds remaining at the current speed; null when unknowable. */
  etaSeconds: number | null;
  errorMessage: string | null;
  /** Server-side id (video id or media asset id) once a session exists. */
  remoteId: string | null;
  /** True when the server matched an already-uploaded identical file. */
  duplicate: boolean;
}

/** What a transport's `create` returns — the server-side session. */
export type CreatedUploadSession =
  | { kind: "single"; remoteId: string; url: string }
  | { kind: "multipart"; remoteId: string; partSize: number; uploadId: string | null }
  | { kind: "duplicate"; remoteId: string };

/**
 * The seam between the engine and a domain's server actions. `uploadId`
 * is an opaque provider token some transports carry client-side (media)
 * and some keep server-side (video → `null`).
 */
export interface UploadTransport {
  /** Namespace for localStorage resume sessions ("media", "video:<courseId>"). */
  readonly sessionScope: string;
  create(file: File, title: string): Promise<CreatedUploadSession>;
  signParts(remoteId: string, uploadId: string | null, partNumbers: number[]): Promise<SignedPartUrl[]>;
  complete(remoteId: string, uploadId: string | null, parts: CompletedPart[] | null): Promise<void>;
  abort(remoteId: string, uploadId: string | null): Promise<void>;
}

interface PersistedSession {
  remoteId: string;
  kind: "single" | "multipart";
  partSize: number;
  uploadId: string | null;
  parts: { partNumber: number; etag: string; size: number }[];
}

const CONCURRENCY = 3;
const MAX_ATTEMPTS = 4;
const SIGN_BATCH_SIZE = 10;
const STORAGE_PREFIX = "bosla:upload:";
const SPEED_WINDOW_MS = 8000;

function readSession(key: string): PersistedSession | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    if (!parsed.remoteId || !parsed.kind || !Array.isArray(parsed.parts)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSession(key: string, session: PersistedSession): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(session));
  } catch {
    // Quota/private-mode failures only cost resumability, not the upload.
  }
}

function clearSession(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Best-effort.
  }
}

let nextLocalId = 0;

export class ResumableUpload {
  readonly id = `upload-${++nextLocalId}`;
  readonly file: File;

  private readonly transport: UploadTransport;
  private readonly title: string;
  private readonly onChange: (snapshot: UploadSnapshot) => void;
  private readonly storageKey: string;
  private state: UploadState = "queued";
  private remoteId: string | null = null;
  private sessionKind: "single" | "multipart" = "single";
  private uploadId: string | null = null;
  private partSize = 0;
  private partCount = 0;
  private duplicate = false;
  private completedParts = new Map<number, { etag: string; size: number }>();
  private inFlight = new Map<number, { xhr: XMLHttpRequest; loaded: number }>();
  private signedUrls = new Map<number, string>();
  private singleUrl: string | null = null;
  private errorMessage: string | null = null;
  private speedSamples: { at: number; bytes: number }[] = [];
  private lastEmittedBytes = 0;
  private runToken = 0;

  constructor(
    file: File,
    options: { transport: UploadTransport; title: string; onChange: (snapshot: UploadSnapshot) => void },
  ) {
    this.file = file;
    this.transport = options.transport;
    this.title = options.title;
    this.onChange = options.onChange;
    this.storageKey = `${STORAGE_PREFIX}${options.transport.sessionScope}:${file.name}:${file.size}:${file.lastModified}`;
  }

  snapshot(): UploadSnapshot {
    const uploadedBytes = this.uploadedBytes();
    const speedBps = this.currentSpeed();
    const remaining = this.file.size - uploadedBytes;
    return {
      id: this.id,
      fileName: this.file.name,
      title: this.title,
      state: this.state,
      uploadedBytes,
      totalBytes: this.file.size,
      percent: this.file.size > 0 ? Math.min(100, (uploadedBytes / this.file.size) * 100) : 0,
      speedBps,
      etaSeconds: speedBps > 0 && remaining > 0 ? Math.ceil(remaining / speedBps) : null,
      errorMessage: this.errorMessage,
      remoteId: this.remoteId,
      duplicate: this.duplicate,
    };
  }

  async start(): Promise<void> {
    if (this.state !== "queued" && this.state !== "error" && this.state !== "paused") return;
    this.errorMessage = null;
    this.setState("starting");
    const token = ++this.runToken;

    try {
      if (!this.remoteId) {
        const persisted = readSession(this.storageKey);
        if (persisted) {
          this.remoteId = persisted.remoteId;
          this.sessionKind = persisted.kind;
          this.partSize = persisted.partSize;
          this.uploadId = persisted.uploadId;
          this.completedParts = new Map(
            persisted.parts.map((part) => [part.partNumber, { etag: part.etag, size: part.size }]),
          );
        } else {
          const created = await this.transport.create(this.file, this.title);
          if (created.kind === "duplicate") {
            this.remoteId = created.remoteId;
            this.duplicate = true;
            this.setState("ready");
            return;
          }
          this.remoteId = created.remoteId;
          this.sessionKind = created.kind;
          if (created.kind === "single") {
            this.singleUrl = created.url;
            this.partSize = this.file.size;
          } else {
            this.partSize = created.partSize;
            this.uploadId = created.uploadId;
          }
          this.persist();
        }
      }
      if (token !== this.runToken) return;
      this.setState("uploading");

      if (this.sessionKind === "single") {
        await this.pumpSingle(token);
      } else {
        this.partCount = Math.max(1, Math.ceil(this.file.size / this.partSize));
        await this.pumpMultipart(token);
      }
    } catch (error) {
      if (token !== this.runToken) return;
      this.fail(error);
    }
  }

  pause(): void {
    // A single-PUT upload has no resumable chunks — pausing it would
    // restart from zero, so treat pause as unsupported there.
    if (this.sessionKind === "single") return;
    if (this.state !== "uploading" && this.state !== "starting") return;
    this.runToken++;
    for (const { xhr } of this.inFlight.values()) xhr.abort();
    this.inFlight.clear();
    this.speedSamples = [];
    this.setState("paused");
  }

  resume(): void {
    if (this.state !== "paused" && this.state !== "error") return;
    void this.start();
  }

  async cancel(): Promise<void> {
    this.runToken++;
    for (const { xhr } of this.inFlight.values()) xhr.abort();
    this.inFlight.clear();
    clearSession(this.storageKey);
    const remoteId = this.remoteId;
    const uploadId = this.uploadId;
    this.setState("canceled");
    if (remoteId && !this.duplicate) {
      // Fire-and-forget: server-side abort frees orphaned parts/rows.
      void this.transport.abort(remoteId, uploadId).catch(() => undefined);
    }
  }

  retry(): void {
    if (this.state !== "error") return;
    void this.start();
  }

  /** Called by the owning hook when server-side processing finishes. */
  markProcessingResult(ready: boolean, message?: string): void {
    if (this.state !== "processing") return;
    if (ready) {
      this.setState("ready");
    } else {
      this.errorMessage = message ?? null;
      this.setState("error");
    }
  }

  get canPause(): boolean {
    return this.sessionKind === "multipart";
  }

  private async pumpSingle(token: number): Promise<void> {
    if (!this.singleUrl) {
      // Resumed single-PUT session after reload: the presigned URL is
      // gone with the page. Start over cleanly.
      clearSession(this.storageKey);
      this.remoteId = null;
      if (token !== this.runToken) return;
      this.setState("queued");
      await this.start();
      return;
    }
    await this.putBlob(0, this.singleUrl, this.file, token, false);
    if (token !== this.runToken) return;
    this.setState("completing");
    await this.transport.complete(this.remoteId!, null, null);
    clearSession(this.storageKey);
    this.setState("processing");
  }

  private async pumpMultipart(token: number): Promise<void> {
    const pending: number[] = [];
    for (let partNumber = 1; partNumber <= this.partCount; partNumber++) {
      if (!this.completedParts.has(partNumber)) pending.push(partNumber);
    }

    let cursor = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, pending.length) }, async () => {
      while (token === this.runToken) {
        const index = cursor++;
        if (index >= pending.length) return;
        await this.uploadPart(pending[index], token);
      }
    });
    await Promise.all(workers);
    if (token !== this.runToken) return;

    this.setState("completing");
    const parts = [...this.completedParts.entries()]
      .map(([partNumber, part]) => ({ partNumber, etag: part.etag }))
      .sort((a, b) => a.partNumber - b.partNumber);
    await this.transport.complete(this.remoteId!, this.uploadId, parts);
    clearSession(this.storageKey);
    this.setState("processing");
  }

  private async uploadPart(partNumber: number, token: number): Promise<void> {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      if (token !== this.runToken) return;
      try {
        const url = await this.signedUrlFor(partNumber);
        const blob = this.partBlob(partNumber);
        const etag = await this.putBlob(partNumber, url, blob, token, true);
        if (token !== this.runToken) return;
        this.completedParts.set(partNumber, { etag: etag!, size: blob.size });
        this.signedUrls.delete(partNumber);
        this.persist();
        this.emit();
        return;
      } catch (error) {
        if (token !== this.runToken) return;
        this.signedUrls.delete(partNumber);
        if (attempt === MAX_ATTEMPTS) throw error;
        // 1s, 2s, 4s — jittered so parallel failures don't stampede.
        const delay = 1000 * 2 ** (attempt - 1) * (0.75 + Math.random() / 2);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  private async signedUrlFor(partNumber: number): Promise<string> {
    const cached = this.signedUrls.get(partNumber);
    if (cached) return cached;
    const batch: number[] = [];
    for (
      let candidate = partNumber;
      candidate <= this.partCount && batch.length < SIGN_BATCH_SIZE;
      candidate++
    ) {
      if (!this.completedParts.has(candidate) && !this.signedUrls.has(candidate)) {
        batch.push(candidate);
      }
    }
    const signed = await this.transport.signParts(this.remoteId!, this.uploadId, batch);
    for (const part of signed) this.signedUrls.set(part.partNumber, part.url);
    const url = this.signedUrls.get(partNumber);
    if (!url) throw new Error("Signed URL missing for part.");
    return url;
  }

  private partBlob(partNumber: number): Blob {
    const start = (partNumber - 1) * this.partSize;
    return this.file.slice(start, Math.min(start + this.partSize, this.file.size));
  }

  /** PUT one blob with progress; resolves the ETag when `needEtag`. */
  private putBlob(
    slot: number,
    url: string,
    blob: Blob,
    token: number,
    needEtag: boolean,
  ): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      this.inFlight.set(slot, { xhr, loaded: 0 });
      xhr.open("PUT", url);
      if (this.sessionKind === "single" && this.file.type) {
        // Single presigned PUTs are signed with the content type baked in.
        xhr.setRequestHeader("Content-Type", this.file.type);
      }
      xhr.upload.onprogress = (event) => {
        if (token !== this.runToken) return;
        const entry = this.inFlight.get(slot);
        if (entry) entry.loaded = event.loaded;
        this.recordSpeedSample();
        this.emit();
      };
      xhr.onerror = () => {
        this.inFlight.delete(slot);
        reject(new Error("Network error while uploading."));
      };
      xhr.onabort = () => {
        this.inFlight.delete(slot);
        reject(new Error("Upload aborted."));
      };
      xhr.onload = () => {
        this.inFlight.delete(slot);
        if (xhr.status >= 200 && xhr.status < 300) {
          if (!needEtag) {
            resolve(null);
            return;
          }
          // Requires the bucket CORS policy to expose the ETag header —
          // documented in docs/media-platform.md; without it multipart
          // completion is impossible, so fail loudly and early.
          const etag = xhr.getResponseHeader("ETag");
          if (!etag) {
            reject(
              new Error("Storage did not expose an ETag header. Check the bucket CORS configuration."),
            );
            return;
          }
          resolve(etag.replaceAll('"', ""));
        } else {
          reject(new Error(`Storage rejected the upload (HTTP ${xhr.status}).`));
        }
      };
      xhr.send(blob);
    });
  }

  private uploadedBytes(): number {
    let bytes = 0;
    for (const part of this.completedParts.values()) bytes += part.size;
    for (const entry of this.inFlight.values()) bytes += entry.loaded;
    if (this.state === "processing" || this.state === "ready" || this.state === "completing") {
      return this.file.size;
    }
    return Math.min(bytes, this.file.size);
  }

  private recordSpeedSample(): void {
    const now = Date.now();
    this.speedSamples.push({ at: now, bytes: this.uploadedBytes() });
    while (this.speedSamples.length > 2 && this.speedSamples[0].at < now - SPEED_WINDOW_MS) {
      this.speedSamples.shift();
    }
  }

  private currentSpeed(): number {
    if (this.state !== "uploading" || this.speedSamples.length < 2) return 0;
    const first = this.speedSamples[0];
    const last = this.speedSamples[this.speedSamples.length - 1];
    const seconds = (last.at - first.at) / 1000;
    if (seconds <= 0) return 0;
    return Math.max(0, (last.bytes - first.bytes) / seconds);
  }

  private persist(): void {
    if (!this.remoteId) return;
    writeSession(this.storageKey, {
      remoteId: this.remoteId,
      kind: this.sessionKind,
      partSize: this.partSize,
      uploadId: this.uploadId,
      parts: [...this.completedParts.entries()].map(([partNumber, part]) => ({
        partNumber,
        etag: part.etag,
        size: part.size,
      })),
    });
  }

  private setState(state: UploadState): void {
    this.state = state;
    this.emit(true);
  }

  private fail(error: unknown): void {
    this.errorMessage = error instanceof Error ? error.message : "Upload failed.";
    for (const { xhr } of this.inFlight.values()) xhr.abort();
    this.inFlight.clear();
    this.setState("error");
  }

  private emit(force = false): void {
    // Throttle progress-only emissions to meaningful byte movement so a
    // 3-way-concurrent upload doesn't re-render the list hundreds of
    // times a second; state changes (setState) always force through.
    const uploaded = this.uploadedBytes();
    if (
      !force &&
      this.state === "uploading" &&
      Math.abs(uploaded - this.lastEmittedBytes) < 128 * 1024
    ) {
      return;
    }
    this.lastEmittedBytes = uploaded;
    this.onChange(this.snapshot());
  }
}
