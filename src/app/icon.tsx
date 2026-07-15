import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * The Bosla favicon — the compact mark (needle arrowhead + three
 * vertebrae, no bezel; see `components/brand/bosla-mark.tsx` for the
 * geometry rationale) in white on the brand blue. Inline paths rather
 * than importing `BoslaIcon`: `ImageResponse` renders in an OG worker
 * where the component's `cn` helper doesn't belong.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#4353c9",
          borderRadius: 7,
        }}
      >
        <svg width="14" height="25" viewBox="16 2 32 56" fill="white">
          <path d="M32 6 L42 24 Q32 20 22 24 Z" />
          <path d="M25.5 28 h13 q1.5 0 1.5 1.5 v4 q0 1.5 -1.5 1.5 h-13 q-1.5 0 -1.5 -1.5 v-4 q0 -1.5 1.5 -1.5 Z" />
          <path
            d="M27 38.5 h10 q1.5 0 1.5 1.5 v3.5 q0 1.5 -1.5 1.5 h-10 q-1.5 0 -1.5 -1.5 v-3.5 q0 -1.5 1.5 -1.5 Z"
            opacity={0.82}
          />
          <path
            d="M28.5 48 h7 q1.5 0 1.5 1.5 v3 q0 1.5 -1.5 1.5 h-7 q-1.5 0 -1.5 -1.5 v-3 q0 -1.5 1.5 -1.5 Z"
            opacity={0.64}
          />
        </svg>
      </div>
    ),
    size,
  );
}
