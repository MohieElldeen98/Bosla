/**
 * The Bosla mark's shared geometry — one source of truth the whole
 * identity kit (logo, icon, watermark, loader, progress) draws from, so
 * a shape tweak here propagates everywhere.
 *
 * The idea: a compass needle and a spinal column share a silhouette — a
 * pointed head with a segmented tail. The arrowhead is the needle's tip
 * (بوصلة = compass, guidance); the tapering vertebrae behind it are both
 * the needle's tail and a spine (the medical audience). One shape, two
 * readings.
 *
 * Canvas: 64×64. The needle group is centered on x=32 so rotation
 * animations pivot cleanly on (32, 32).
 */

/** Arrowhead (needle tip / first cervical vertebra) — points north. */
export const MARK_HEAD = "M32 6 L42 24 Q32 20 22 24 Z";

/** Three vertebrae tapering down the needle's tail — subtle waisted
 *  sides so they read as bone, not plain rectangles. */
export const MARK_VERTEBRAE = [
  "M25.5 28 h13 q1.5 0 1.5 1.5 v4 q0 1.5 -1.5 1.5 h-13 q-1.5 0 -1.5 -1.5 v-4 q0 -1.5 1.5 -1.5 Z",
  "M27 38.5 h10 q1.5 0 1.5 1.5 v3.5 q0 1.5 -1.5 1.5 h-10 q-1.5 0 -1.5 -1.5 v-3.5 q0 -1.5 1.5 -1.5 Z",
  "M28.5 48 h7 q1.5 0 1.5 1.5 v3 q0 1.5 -1.5 1.5 h-7 q-1.5 0 -1.5 -1.5 v-3 q0 -1.5 1.5 -1.5 Z",
] as const;

/** The compass bezel. */
export const MARK_RING = { cx: 32, cy: 32, r: 29 } as const;

/** Cardinal tick marks (N E S W) on the bezel's inner edge. */
export const MARK_TICKS = [
  "M32 3 v4",
  "M61 32 h-4",
  "M32 61 v-4",
  "M3 32 h4",
] as const;
