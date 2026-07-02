/**
 * Reserved for future public marketing pages (About, Pricing, etc. — see
 * docs/architecture.md §3). No guard: intentionally open to guests. Today's
 * homepage stays at `src/app/[locale]/page.tsx`, unmoved — moving it here is
 * a routing change with no architectural benefit until this group actually
 * has content, so it's deferred.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
