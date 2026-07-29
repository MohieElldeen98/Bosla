import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { siteUrl } from "./src/lib/site-config";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const supabaseHostname = (() => {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!configuredUrl) return "**.supabase.co";

  try {
    return new URL(configuredUrl).hostname;
  } catch {
    return "**.supabase.co";
  }
})();

const nextConfig: NextConfig = {
  // intl-messageformat@11.2.9 (a transitive dep of use-intl/next-intl)
  // ships native ES2022 class static-initialization blocks in its
  // published dist — SWC only transpiles first-party app code by
  // browserslist target, never pre-built node_modules code, so without
  // this the raw syntax passes straight through and fails to parse on
  // Safari <16.4 (confirmed via a real iPhone on Safari 15.6:
  // "Unexpected token '{'", 0 bytes transferred — a parse error, not a
  // network one). The same bug also hit @heroui/react's own deps
  // (react-aria-components/react-aria/react-stately), but their static
  // blocks live in `dist/private/*` files that sit outside those
  // packages' own `exports` map and aren't reliably routed through this
  // mechanism — those are fixed instead via the pnpm patches in
  // `patches/` (see pnpm-workspace.yaml's patchedDependencies).
  transpilePackages: ["intl-messageformat"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHostname,
        pathname: "/storage/v1/object/public/**",
      },
      {
        // The app's own origin — `src/lib/site-config.ts`'s `siteUrl`,
        // not a second copy of its resolution logic. Needed so
        // `mediaDeliveryUrl`'s absolute `/api/media/...` URLs count as
        // "remote" to next/image's optimizer instead of its
        // internal-fetch shortcut, which never follows that route's
        // redirect to the signed storage URL (see
        // media-delivery.service.ts's doc comment).
        //
        // This used to be its own copy of the same "fall back to
        // localhost" logic `siteUrl` has — which meant that when
        // NEXT_PUBLIC_SITE_URL was missing in Vercel, this file and
        // site-config.ts silently agreed on the same wrong default, so
        // next/image happily allow-listed `localhost:3000` as a
        // "remote" host in production instead of anything ever failing
        // loudly. Importing the one shared value instead means a
        // missing/misconfigured origin fails the build here too, not
        // just at runtime.
        protocol: siteUrl.protocol.replace(":", "") as "http" | "https",
        hostname: siteUrl.hostname,
        port: siteUrl.port || undefined,
        pathname: "/api/media/**",
      },
    ],
    // Instructor/media placeholders are locally generated SVGs (no embedded
    // scripts) served from /public — safe to allow through the optimizer.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default withNextIntl(nextConfig);
