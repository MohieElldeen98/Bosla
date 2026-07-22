/**
 * The app's own public origin — the ONE source of truth every absolute
 * URL the app mints derives from: media delivery (`mediaDeliveryUrl`,
 * `mediaThumbnailUrl`, `mediaVariantUrl`), checkout return URLs, auth
 * email links, social share links, and `next.config.ts`'s own
 * `images.remotePatterns` (imports this exact value — see that file's
 * comment for why sharing it, not duplicating it, is itself the fix for
 * a real production bug).
 *
 * There is no safe way to *infer* a public-facing origin from inside the
 * server (Vercel's own `VERCEL_URL` is the preview deployment's hash
 * hostname, not the custom domain), so `NEXT_PUBLIC_SITE_URL` is the only
 * correct source — and this throws at import time rather than silently
 * defaulting to an origin that only exists on a developer's machine if
 * it's missing anywhere that isn't local dev. `NODE_ENV === "development"`
 * is the one exception, so `next dev` keeps working with zero setup.
 *
 * `NEXT_PUBLIC_*` variables are inlined by Next.js at *build* time, not
 * read per-request — this must be set wherever `next build` runs (Vercel:
 * the Production environment's variables, scoped to include the Build
 * step), and a value added after a build already ran only takes effect
 * on the *next* build.
 */
function resolveSiteUrl(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return new URL(configured);
  if (process.env.NODE_ENV === "development") return new URL("http://localhost:3000");
  throw new Error(
    'NEXT_PUBLIC_SITE_URL is required outside local development (NODE_ENV="development") — ' +
      'set it to this deployment\'s public origin (e.g. "https://lbosla.com") in your environment ' +
      "variables. Every absolute media/share/redirect URL the app mints depends on it; there is " +
      "no safe default outside dev.",
  );
}

export const siteUrl = resolveSiteUrl();
