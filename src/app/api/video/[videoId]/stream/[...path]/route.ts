import { NextResponse } from "next/server";
import { SessionService } from "@/auth/services/session.service";
import { getMediaStorage } from "@/media/storage";
import {
  authorizeVideoPlayback,
  getImageRedirectUrl,
  getMasterPlaylist,
  getRenditionPlaylist,
  getSourceRedirectUrl,
} from "@/video/services/video-playback.service";

/**
 * Phase 6 — the one URL surface a video player ever talks to:
 *
 *   GET /api/video/:videoId/stream/master.m3u8         → master playlist
 *   GET /api/video/:videoId/stream/:height p/index.m3u8 → variant playlist
 *                                    (segments rewritten to signed URLs)
 *   GET /api/video/:videoId/stream/source              → 302 to signed
 *                                    source file (FFmpeg-less fallback)
 *   GET /api/video/:videoId/stream/thumbnail.jpg       → 302 to signed jpg
 *   GET /api/video/:videoId/stream/preview.jpg         → 302 to signed jpg
 *
 * Every request re-runs authorization (`authorizeVideoPlayback`); the
 * responses are tiny text or redirects — video bytes never flow through
 * this server. `no-store` on playlists: their signed URLs are personal
 * and short-lived, caching them would leak capability across users.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLAYLIST_HEADERS = {
  "Content-Type": "application/vnd.apple.mpegurl",
  "Cache-Control": "private, no-store",
} as const;

export async function GET(
  _request: Request,
  context: { params: Promise<{ videoId: string; path: string[] }> },
): Promise<Response> {
  const { videoId, path } = await context.params;

  if (!getMediaStorage()) {
    return NextResponse.json({ error: "Video storage is not configured." }, { status: 503 });
  }

  const user = await SessionService.getCurrentUser();
  const auth = await authorizeVideoPlayback(user, videoId);
  if (!auth.ok) {
    return NextResponse.json({ error: "Not available." }, { status: auth.status });
  }
  const video = auth.video;

  try {
    if (path.length === 1 && path[0] === "master.m3u8") {
      const playlist = await getMasterPlaylist(video);
      if (playlist === null) {
        // No HLS artifacts (processing skipped) — send the player to the
        // source fallback instead of 404ing the whole lesson.
        return NextResponse.redirect(await getSourceRedirectUrl(video), 302);
      }
      return new Response(playlist, { headers: PLAYLIST_HEADERS });
    }

    if (path.length === 2 && path[1] === "index.m3u8" && /^\d{3,4}p$/.test(path[0])) {
      const playlist = await getRenditionPlaylist(video, Number.parseInt(path[0], 10));
      if (playlist === null) {
        return NextResponse.json({ error: "Not available." }, { status: 404 });
      }
      return new Response(playlist, { headers: PLAYLIST_HEADERS });
    }

    if (path.length === 1 && path[0] === "source") {
      return NextResponse.redirect(await getSourceRedirectUrl(video), 302);
    }

    if (path.length === 1 && (path[0] === "thumbnail.jpg" || path[0] === "preview.jpg")) {
      const url = await getImageRedirectUrl(video, path[0] === "thumbnail.jpg" ? "thumbnail" : "preview");
      if (!url) return NextResponse.json({ error: "Not available." }, { status: 404 });
      return NextResponse.redirect(url, 302);
    }

    return NextResponse.json({ error: "Not available." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Playback is temporarily unavailable." }, { status: 502 });
  }
}
