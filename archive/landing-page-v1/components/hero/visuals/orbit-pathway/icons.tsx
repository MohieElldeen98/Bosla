import type { ComponentType, SVGProps } from "react";
import type { IconName } from "./config";

// Stroke-only 24x24 glyphs, ported 1:1 from reference/orbit-mastery.js.
// Fill/stroke/line-cap come from the `.orb__disc svg` rule in
// orbit-pathway.css (currentColor picks up the node's accent) — these
// components carry no color of their own.
type IconProps = SVGProps<SVGSVGElement>;

function SpineIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M12 3.2v17.6" />
      <path d="M8.6 6.2h6.8" />
      <path d="M8.1 9.7h7.8" />
      <path d="M8.1 13.2h7.8" />
      <path d="M8.6 16.7h6.8" />
      <path d="M9.8 20.2h4.4" />
    </svg>
  );
}

function AppleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M12 8.6c-1.5-1.7-4.1-2-5.6-.3-1.7 1.8-1.2 5.2.4 7.6 1 1.5 2.4 3.2 4 3.8.8.3 1.6.3 2.4 0 1.6-.6 3-2.3 4-3.8 1.6-2.4 2.1-5.8.4-7.6-1.5-1.7-4.1-1.4-5.6.3Z" />
      <path d="M12 8.6V6.3c1.6-1.7 3.2-1.6 3.9-1.3.3.7.3 2.4-1.4 3.6" />
    </svg>
  );
}

function BookIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M4.2 5.6A2.4 2.4 0 0 1 6.6 3.2H19v14.2H6.6a2.4 2.4 0 0 0-2.4 2.4Z" />
      <path d="M4.2 19.8a2.4 2.4 0 0 1 2.4-2.4H19v3.4H6.6" />
      <path d="M9.2 7.6h6" />
    </svg>
  );
}

function ScalesIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M12 3.4v17.2" />
      <path d="M7.2 20.6h9.6" />
      <path d="M4.6 6.8h14.8" />
      <path d="M4.6 6.8 2 13.4h5.2Z" />
      <path d="M19.4 6.8 16.8 13.4H22Z" />
    </svg>
  );
}

function MicroscopeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M6.6 20.4h10.8" />
      <path d="M9.6 20.4a5.6 5.6 0 0 0 5.6-5.6" />
      <path d="M12.6 3.4 8.9 7.1l3.1 3.1 3.7-3.7a2.2 2.2 0 0 0-3.1-3.1Z" />
      <path d="M10.3 10.6 8.1 12.8" />
      <path d="M6.4 15.2h5.4" />
    </svg>
  );
}

export const ORBIT_ICONS: Record<IconName, ComponentType<IconProps>> = {
  spine: SpineIcon,
  apple: AppleIcon,
  book: BookIcon,
  scales: ScalesIcon,
  microscope: MicroscopeIcon,
};
