import { BoslaLoader } from "@/components/brand/BoslaLoader";

/**
 * The full-page loading scene — shared by the route-level `loading.tsx`
 * and `NavigationLoader` (click feedback) so both moments look identical.
 * Speaks the site's existing dark-band language (the CTA section's
 * near-black + radial primary glow + dot-grid map texture) rather than a
 * flat scrim, and fades in after a 150ms delay so instant navigations
 * never flash it (`bosla-overlay` in globals.css).
 */
export function BoslaPageLoader() {
  return (
    <div className="bosla-overlay fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-neutral-950/85 backdrop-blur-sm">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="bg-dot-grid absolute inset-0 [mask-image:radial-gradient(ellipse_45%_45%_at_50%_50%,black,transparent)]" />
        <div className="absolute top-1/2 left-1/2 size-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/30 blur-[110px]" />
      </div>
      <BoslaLoader className="relative size-24 text-white drop-shadow-lg" />
      <p className="relative text-sm font-medium tracking-[0.2em] text-white/50">بوصلة · BOSLA</p>
    </div>
  );
}
