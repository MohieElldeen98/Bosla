import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/site-config";

/** Account, authoring, checkout, and player surfaces are either
 *  session-gated or thin forms — nothing a search result should land on. */
const PRIVATE_PATHS = [
  "/admin",
  "/instructor",
  "/dashboard",
  "/me",
  "/checkout",
  "/notifications",
  "/profile",
  "/settings",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/blog/my",
  "/blog/new",
  "/courses/new",
];

export default function robots(): MetadataRoute.Robots {
  const disallow = routing.locales.flatMap((locale) => [
    ...PRIVATE_PATHS.map((path) => `/${locale}${path}`),
    // Editor and player routes nested under a public slug.
    `/${locale}/blog/*/edit`,
    `/${locale}/courses/*/edit`,
    `/${locale}/courses/*/curriculum`,
    `/${locale}/courses/*/learn`,
  ]);

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", ...disallow] }],
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
    host: siteUrl.origin,
  };
}
