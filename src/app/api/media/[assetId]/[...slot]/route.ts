import { NextResponse } from "next/server";
import { SessionService } from "@/auth/services/session.service";
import { CmsMediaService } from "@/cms/services/media.service";
import {
  authorizeMediaAccess,
  signedKeyUrl,
  signedOriginalUrl,
  variantKeyFor,
} from "@/media/services/media-delivery.service";

/**
 * The one URL surface a protected media asset ever serves from
 * (docs/media-platform.md "Security model"):
 *
 *   GET /api/media/:assetId/file            → 302 signed original
 *   GET /api/media/:assetId/thumbnail       → 302 signed thumbnail
 *   GET /api/media/:assetId/variant/:name   → 302 signed image variant
 *
 * Every request re-runs the visibility gate (`authorizeMediaAccess`);
 * responses are redirects — bytes flow storage → browser directly.
 * Legacy Supabase-era rows (`storageKey: null`) redirect to their stored
 * public URL so pre-migration content keeps serving.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ assetId: string; slot: string[] }> },
): Promise<Response> {
  const { assetId, slot } = await context.params;

  const asset = await CmsMediaService.getLibraryById(assetId);
  if (!asset) {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  const user = await SessionService.getCurrentUser();
  const access = await authorizeMediaAccess(user, asset);
  if (!access.ok) {
    return NextResponse.json({ error: "Not available." }, { status: access.status });
  }

  try {
    if (slot.length === 1 && slot[0] === "file") {
      if (!asset.storageKey) {
        return NextResponse.redirect(asset.url, 302);
      }
      const url = await signedOriginalUrl(asset);
      if (!url) return NextResponse.json({ error: "Media storage is not configured." }, { status: 503 });
      return NextResponse.redirect(url, 302);
    }

    if (slot.length === 1 && slot[0] === "thumbnail") {
      const key = asset.thumbnailKey;
      if (!key) return NextResponse.json({ error: "Not available." }, { status: 404 });
      const url = await signedKeyUrl(key);
      if (!url) return NextResponse.json({ error: "Media storage is not configured." }, { status: 503 });
      return NextResponse.redirect(url, 302);
    }

    if (slot.length === 2 && slot[0] === "variant") {
      const key = variantKeyFor(asset, slot[1]);
      if (!key) return NextResponse.json({ error: "Not available." }, { status: 404 });
      const url = await signedKeyUrl(key);
      if (!url) return NextResponse.json({ error: "Media storage is not configured." }, { status: 503 });
      return NextResponse.redirect(url, 302);
    }

    return NextResponse.json({ error: "Not available." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Media is temporarily unavailable." }, { status: 502 });
  }
}
