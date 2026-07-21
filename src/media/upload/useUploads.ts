"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ResumableUpload, type UploadSnapshot, type UploadTransport } from "./engine";

const PROCESSING_POLL_MS = 5000;

/**
 * React binding for the shared upload engine: owns a list of concurrent
 * `ResumableUpload`s, mirrors their snapshots into state, and polls a
 * transport-specific status check for uploads whose bytes have landed
 * and are processing server-side.
 */
export function useUploads({
  transport,
  checkProcessing,
  onReady,
}: {
  transport: UploadTransport;
  /** Resolve a remote id to its processing outcome; `null` = still going. */
  checkProcessing: (remoteId: string) => Promise<{ ready: boolean; message?: string } | null>;
  onReady?: (remoteId: string) => void;
}) {
  const uploadsRef = useRef(new Map<string, ResumableUpload>());
  const [snapshots, setSnapshots] = useState<UploadSnapshot[]>([]);

  const applySnapshot = useCallback((snapshot: UploadSnapshot) => {
    setSnapshots((current) => {
      const index = current.findIndex((entry) => entry.id === snapshot.id);
      if (index === -1) return [...current, snapshot];
      const next = [...current];
      next[index] = snapshot;
      return next;
    });
  }, []);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const added: ResumableUpload[] = [];
      for (const file of Array.from(files)) {
        const upload = new ResumableUpload(file, {
          transport,
          title: file.name.replace(/\.[^.]+$/, "") || file.name,
          onChange: applySnapshot,
        });
        uploadsRef.current.set(upload.id, upload);
        applySnapshot(upload.snapshot());
        void upload.start();
        added.push(upload);
      }
      return added;
    },
    [transport, applySnapshot],
  );

  const pause = useCallback((id: string) => uploadsRef.current.get(id)?.pause(), []);
  const resume = useCallback((id: string) => uploadsRef.current.get(id)?.resume(), []);
  const retry = useCallback((id: string) => uploadsRef.current.get(id)?.retry(), []);
  const cancel = useCallback((id: string) => {
    void uploadsRef.current.get(id)?.cancel();
  }, []);
  const dismiss = useCallback((id: string) => {
    uploadsRef.current.delete(id);
    setSnapshots((current) => current.filter((entry) => entry.id !== id));
  }, []);
  const canPause = useCallback((id: string) => uploadsRef.current.get(id)?.canPause ?? false, []);

  const processingIds = snapshots
    .filter((entry) => entry.state === "processing" && entry.remoteId)
    .map((entry) => entry.id)
    .join(",");

  useEffect(() => {
    if (!processingIds) return undefined;
    const interval = window.setInterval(() => {
      for (const id of processingIds.split(",")) {
        const upload = uploadsRef.current.get(id);
        const remoteId = upload?.snapshot().remoteId;
        if (!upload || !remoteId) continue;
        void checkProcessing(remoteId).then((outcome) => {
          if (!outcome) return;
          upload.markProcessingResult(outcome.ready, outcome.message);
          if (outcome.ready) onReady?.(remoteId);
        });
      }
    }, PROCESSING_POLL_MS);
    return () => window.clearInterval(interval);
  }, [processingIds, checkProcessing, onReady]);

  return { snapshots, addFiles, pause, resume, retry, cancel, dismiss, canPause };
}
