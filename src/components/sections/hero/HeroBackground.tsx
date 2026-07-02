/**
 * Layer 1 — pure decoration. A clean white field with very soft, almost
 * invisible blue/green blurred glows for a bright, airy "clinic" feeling.
 * No cards, no borders, nothing that could read as a UI surface.
 */
export function HeroBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden bg-white"
    >
      <div className="absolute -top-40 start-0 size-[42rem] rounded-full bg-sky-100/50 blur-[140px]" />
      <div className="absolute -bottom-32 end-0 size-[36rem] rounded-full bg-emerald-100/40 blur-[130px]" />
      <div className="absolute top-1/3 start-1/3 size-[28rem] rounded-full bg-teal-50/50 blur-[120px]" />
    </div>
  );
}
