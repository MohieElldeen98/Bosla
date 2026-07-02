/**
 * Guards against open-redirect via a `redirectTo`/`next`-style query param:
 * must be a same-site relative path (`/dashboard`), never an absolute URL
 * or protocol-relative one (`//evil.com`) that a browser would still treat
 * as external.
 */
export function isSafeRedirectPath(path: string | null | undefined): path is string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//");
}
