import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

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

/** Mirrors `src/lib/site-config.ts`'s `siteUrl` fallback exactly (dev:
 *  localhost:3000, prod: `NEXT_PUBLIC_SITE_URL`) — the app's own origin,
 *  needed so `mediaDeliveryUrl`'s absolute `/api/media/...` URLs count as
 *  "remote" to next/image's optimizer instead of its internal-fetch
 *  shortcut, which never follows that route's redirect to the signed
 *  storage URL (see media-delivery.service.ts's doc comment). */
const siteOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHostname,
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: siteOrigin.protocol.replace(":", "") as "http" | "https",
        hostname: siteOrigin.hostname,
        port: siteOrigin.port || undefined,
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
