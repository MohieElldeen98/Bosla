// Geometry + content data for the orbit scene. Everything downstream
// (SVG paths, HTML overlay positions, curved connectors) is computed from
// this object alone — see `orbit-pathway.tsx`'s `curvePath`/`ellipsePath`.
// `labelKey`/`textKey` are next-intl keys under the "Hero.orbitPathway"
// namespace, not literal strings — see messages/{en,ar}/home.json.

export type IconName = "spine" | "apple" | "book" | "scales" | "microscope";

export interface OrbitCore {
  x: number;
  y: number;
  labelKey: string;
}

export interface OrbitRing {
  rx: number;
  ry: number;
  rot: number;
  dur: number;
  dir: 1 | -1;
  flow?: boolean;
  travel?: number;
}

export interface OrbitNode {
  id: string;
  x: number;
  y: number;
  labelKey: string;
  icon: IconName;
  accent: string;
  size: number;
}

export interface OrbitLink {
  from: string;
  to: string;
  bend: number;
}

export interface OrbitDot {
  x: number;
  y: number;
  r: number;
  accent: string;
}

export interface OrbitTag {
  x: number;
  y: number;
  side: "left" | "right";
  textKey: string;
}

export interface OrbitSparkle {
  x: number;
  y: number;
  s: number;
}

export interface OrbitConfig {
  core: OrbitCore;
  rings: OrbitRing[];
  nodes: OrbitNode[];
  links: OrbitLink[];
  dots: OrbitDot[];
  tags: OrbitTag[];
  sparkles: OrbitSparkle[];
}

// The one true coordinate space — the SVG viewBox and every HTML overlay
// percentage are both derived from these two constants.
export const VIEW_WIDTH = 900;
export const VIEW_HEIGHT = 620;

export const ORBIT_CONFIG: OrbitConfig = {
  core: { x: 430, y: 300, labelKey: "core" },

  rings: [
    { rx: 342, ry: 156, rot: -14, dur: 168, dir: 1, flow: true, travel: 22 },
    { rx: 268, ry: 238, rot: 28, dur: 214, dir: -1 },
    { rx: 362, ry: 202, rot: 17, dur: 262, dir: 1, flow: true, travel: 30 },
    { rx: 188, ry: 174, rot: -37, dur: 126, dir: -1, travel: 16 },
  ],

  nodes: [
    { id: "physio", x: 200, y: 352, labelKey: "nodes.physio", icon: "spine", accent: "167,199,255", size: 74 },
    { id: "nutri", x: 640, y: 132, labelKey: "nodes.nutri", icon: "apple", accent: "126,222,180", size: 62 },
    { id: "research", x: 792, y: 196, labelKey: "nodes.research", icon: "book", accent: "255,164,132", size: 58 },
    { id: "ethics", x: 700, y: 448, labelKey: "nodes.ethics", icon: "scales", accent: "196,176,255", size: 58 },
    {
      id: "evidence",
      x: 486,
      y: 526,
      labelKey: "nodes.evidence",
      icon: "microscope",
      accent: "127,236,240",
      size: 62,
    },
  ],

  links: [
    { from: "core", to: "physio", bend: 46 },
    { from: "core", to: "nutri", bend: -40 },
    { from: "core", to: "research", bend: 34 },
    { from: "core", to: "ethics", bend: -30 },
    { from: "core", to: "evidence", bend: 38 },
    { from: "nutri", to: "research", bend: 26 },
    { from: "research", to: "ethics", bend: 34 },
    { from: "ethics", to: "evidence", bend: 30 },
    { from: "evidence", to: "physio", bend: 34 },
  ],

  dots: [
    { x: 524, y: 96, r: 9, accent: "205,239,251" },
    { x: 352, y: 132, r: 6, accent: "255,255,255" },
    { x: 596, y: 306, r: 5, accent: "255,214,150" },
    { x: 300, y: 470, r: 6, accent: "196,176,255" },
  ],

  tags: [
    { x: 296, y: 112, side: "right", textKey: "tags.specialistPath" },
    { x: 852, y: 92, side: "left", textKey: "tags.skillsComplete" },
    { x: 852, y: 392, side: "left", textKey: "tags.certificationActive" },
    { x: 560, y: 576, side: "right", textKey: "tags.evidenceBased" },
  ],

  sparkles: [
    { x: 330, y: 178, s: 30 },
    { x: 262, y: 236, s: 16 },
    { x: 604, y: 252, s: 15 },
    { x: 772, y: 336, s: 13 },
    { x: 858, y: 486, s: 26 },
    { x: 424, y: 92, s: 13 },
    { x: 470, y: 424, s: 11 },
    { x: 152, y: 470, s: 18 },
  ],
};
