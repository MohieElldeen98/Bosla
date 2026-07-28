import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Minimal client-side error sink — `console.error` here reaches Vercel's
 * function logs, unlike `src/lib/logger.ts` (a deliberate no-op in
 * production) or the browser's own console (which nobody but the affected
 * visitor sees). Deliberately no database write, no third-party service:
 * this exists so a production-only crash leaves a queryable trace instead
 * of requiring a user-supplied screenshot, nothing more.
 *
 * Public and unauthenticated on purpose — errors happen to signed-out
 * visitors too, and requiring a session here would just mean the ones
 * most worth knowing about (a guest hitting a crash) never get reported.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const { message, stack, digest, componentStack, url, userAgent, timestamp } =
      body as Record<string, unknown>;

    console.error("[CLIENT_ERROR]", {
      message: typeof message === "string" ? message.slice(0, 2000) : String(message),
      stack: typeof stack === "string" ? stack.slice(0, 4000) : undefined,
      digest: typeof digest === "string" ? digest : undefined,
      componentStack: typeof componentStack === "string" ? componentStack.slice(0, 4000) : undefined,
      url: typeof url === "string" ? url.slice(0, 500) : undefined,
      userAgent: typeof userAgent === "string" ? userAgent.slice(0, 300) : undefined,
      timestamp: typeof timestamp === "string" ? timestamp : new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Malformed payload isn't worth failing loudly over — this endpoint's
    // only job is best-effort logging.
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
