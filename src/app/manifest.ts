import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bosla",
    short_name: "Bosla",
    description:
      "Bosla is a bilingual learning platform for physiotherapy and nutrition professionals, offering evidence-based, practical courses taught by practicing clinicians.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
    ],
  };
}
