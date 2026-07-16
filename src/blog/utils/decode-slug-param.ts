/**
 * Next.js delivers dynamic route params percent-encoded, so a non-ASCII
 * slug (Arabic titles produce them routinely) arrives as `%D8%A7...`
 * while the database stores the raw string — every lookup must decode
 * first or Arabic articles 404. Malformed sequences (a hand-mangled URL
 * like `%zz`) fall back to the raw value: it then simply misses the
 * lookup and 404s as an unknown slug instead of crashing the page.
 */
export function decodeSlugParam(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}
