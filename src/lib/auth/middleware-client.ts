import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

/**
 * An Edge-safe Supabase client for middleware: reads/writes auth cookies
 * directly against the NextRequest/NextResponse pair instead of
 * `next/headers` (not available in middleware). Kept separate from
 * `src/lib/supabase/{client,server}.ts` because middleware's cookie API
 * shape is different from both the browser and Server Component clients —
 * see docs/authentication-architecture.md §5.
 */
export function createMiddlewareSupabaseClient(
  request: NextRequest,
  response: NextResponse,
) {
  return createServerClient(
    env?.NEXT_PUBLIC_SUPABASE_URL ?? "",
    env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );
}
