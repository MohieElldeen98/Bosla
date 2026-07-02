import type { NextRequest, NextResponse } from "next/server";
import { createMiddlewareSupabaseClient } from "@/lib/auth/middleware-client";
import { toAuthUser } from "@/auth/utils/to-auth-user";
import type { AuthUser } from "@/auth/types/session";

/**
 * Refreshes the Supabase session cookie (writing onto `response`) and
 * resolves the current user, all from the Edge-compatible client — see
 * `lib/auth/middleware-client.ts` for why this can't reuse
 * `lib/supabase/server.ts`.
 *
 * This runs on *every* request the middleware matcher covers — including
 * public marketing pages, not just auth-gated ones. If Supabase env vars
 * are missing/misconfigured, client construction throws synchronously; the
 * try/catch degrades that to "no session" instead of 500-ing the entire
 * site (fail-closed: an unresolved session is treated as a guest, so
 * protected routes still redirect correctly, and public routes keep working
 * regardless of Supabase's availability).
 */
export async function resolveMiddlewareUser(
  request: NextRequest,
  response: NextResponse,
): Promise<AuthUser | null> {
  try {
    const supabase = createMiddlewareSupabaseClient(request, response);
    const { data } = await supabase.auth.getUser();
    return data.user ? toAuthUser(data.user) : null;
  } catch {
    return null;
  }
}
