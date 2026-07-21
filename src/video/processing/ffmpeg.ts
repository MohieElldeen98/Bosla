import "server-only";

import { spawn } from "node:child_process";

/**
 * Thin wrapper over the system FFmpeg/ffprobe binaries. Binary discovery
 * is env-first (`FFMPEG_PATH`/`FFPROBE_PATH`), falling back to `$PATH` —
 * no bundled binary dependency, so deployments without FFmpeg simply
 * report unavailability and the pipeline degrades to source-file playback
 * (docs/video-system.md "How to enable FFmpeg").
 */

export function ffmpegBinary(): string {
  return process.env.FFMPEG_PATH || "ffmpeg";
}

export function ffprobeBinary(): string {
  return process.env.FFPROBE_PATH || "ffprobe";
}

function run(binary: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      // Keep only the tail — FFmpeg logs progress lines endlessly and the
      // useful error is always last.
      stderr = (stderr + chunk.toString()).slice(-4000);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${binary} exited with code ${code}: ${stderr}`));
    });
  });
}

export async function isFfmpegAvailable(): Promise<boolean> {
  try {
    await run(ffmpegBinary(), ["-version"]);
    await run(ffprobeBinary(), ["-version"]);
    return true;
  } catch {
    return false;
  }
}

export async function runFfmpeg(args: string[]): Promise<void> {
  await run(ffmpegBinary(), ["-hide_banner", "-y", ...args]);
}

export interface ProbeResult {
  durationSeconds: number;
  width: number;
  height: number;
  codec: string;
}

export async function probeVideo(filePath: string): Promise<ProbeResult> {
  const stdout = await run(ffprobeBinary(), [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height,codec_name:format=duration",
    "-of",
    "json",
    filePath,
  ]);
  const parsed = JSON.parse(stdout) as {
    streams?: { width?: number; height?: number; codec_name?: string }[];
    format?: { duration?: string };
  };
  const stream = parsed.streams?.[0];
  if (!stream?.width || !stream.height) {
    throw new Error("The uploaded file has no readable video stream.");
  }
  return {
    durationSeconds: Math.round(Number(parsed.format?.duration ?? 0)),
    width: stream.width,
    height: stream.height,
    codec: stream.codec_name ?? "unknown",
  };
}
