/**
 * The learning player's chrome-free shell — same locale segment as
 * `(public)` but deliberately WITHOUT the Navbar/Footer that layout
 * mounts: the lesson owns the screen (docs/courses-ux-spec.md §6), and
 * everything else is one gesture away via the player's own slim top bar
 * (rendered by the page, which has the course data a layout can't see).
 * The route group keeps URLs identical to when these routes lived under
 * `(public)`.
 */
export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
