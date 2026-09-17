import { NotFoundView } from "@/components/error/NotFoundView";

/**
 * There is deliberately NO `loading.tsx` at this segment — do not add one
 * back. A `loading.tsx` anywhere above a page is a Suspense boundary, and
 * Next flushes the response as soon as the boundary's fallback is ready,
 * so any `notFound()` below it can only ever answer HTTP 200 with a
 * `noindex` meta — a soft 404, which search engines treat as a quality
 * problem rather than a removal signal. With the boundary gone, every
 * unknown URL, course slug, and article slug answers a real 404.
 *
 * Known trade-off of a real 404 in Next 15.5: the error response's HTML
 * body ships empty and the page is rendered on the client from the flight
 * payload (verified against Next's own built-in not-found page too, so
 * it's the framework's behaviour, not this tree's). Crawlers get the
 * status code, which is the part that matters; a visitor with JavaScript
 * disabled gets a blank 404. Worth revisiting on a future Next upgrade.
 */

export default function LocaleNotFound() {
  return (
    <main id="main-content" className="flex flex-1 flex-col">
      <NotFoundView />
    </main>
  );
}
