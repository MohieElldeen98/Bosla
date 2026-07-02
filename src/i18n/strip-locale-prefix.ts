import { routing } from "@/i18n/routing";

/**
 * Strips a leading `/en`/`/ar` segment, e.g. for turning a full request
 * pathname into the locale-agnostic shape `auth/constants/routes.ts`'s
 * route rules are written against. Shared by the Edge middleware
 * (`middleware/route-protection.ts`) and Client Components that need to
 * normalize a locale-prefixed `redirectTo` (e.g. `SignInForm`) before
 * handing it to next-intl's locale-aware router — one implementation, two
 * runtimes, no duplicated logic.
 */
export function stripLocalePrefix(pathname: string): string {
  const segments = pathname.split("/");
  const maybeLocale = segments[1];

  if ((routing.locales as readonly string[]).includes(maybeLocale)) {
    return "/" + segments.slice(2).join("/");
  }

  return pathname;
}
