import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    // Instructor/media placeholders are locally generated SVGs (no embedded
    // scripts) served from /public — safe to allow through the optimizer.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    serverActions: {
      // Next's own default (1MB) is well under the Media Library's own
      // `MEDIA_MAX_FILE_SIZE_BYTES` (50MB, `cms/constants/storage.ts`) —
      // `uploadMediaAction` sends the file as `FormData` through a Server
      // Action, so the two limits need to agree, or every real upload
      // (any image/video past ~1MB) fails before ever reaching that
      // service-level check.
      bodySizeLimit: "50mb",
    },
  },
};

export default withNextIntl(nextConfig);
