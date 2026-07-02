import type { MediaAsset } from "@/types/media";

// Stand-in for a future Media Library table backed by Supabase Storage.
// Portraits are transparent-background silhouette illustrations (no
// instructor photography exists yet) — see public/media/instructors/*.svg.
// The Hero uses a single shared HeroBackground (not a per-instructor image),
// so only portraits are modeled here — see docs/cms-overview.md §10.
export const mediaAssetsMock: MediaAsset[] = [
  {
    id: "instructor-yasmine",
    url: "/media/instructors/yasmine.svg",
    alt: {
      en: "Portrait of Dr. Yasmine El-Sayed",
      ar: "صورة الدكتورة ياسمين السيد",
    },
    width: 480,
    height: 900,
  },
  {
    id: "instructor-omar",
    url: "/media/instructors/omar.svg",
    alt: {
      en: "Portrait of Omar Khaled",
      ar: "صورة عمر خالد",
    },
    width: 480,
    height: 900,
  },
  {
    id: "instructor-karim",
    url: "/media/instructors/karim.svg",
    alt: {
      en: "Portrait of Karim Fathy",
      ar: "صورة كريم فتحي",
    },
    width: 480,
    height: 900,
  },
  {
    id: "instructor-laila",
    url: "/media/instructors/laila.svg",
    alt: {
      en: "Portrait of Laila Hassan",
      ar: "صورة ليلى حسن",
    },
    width: 480,
    height: 900,
  },
  {
    id: "instructor-rana",
    url: "/media/instructors/rana.svg",
    alt: {
      en: "Portrait of Dr. Rana Tawfik",
      ar: "صورة الدكتورة رنا توفيق",
    },
    width: 480,
    height: 900,
  },
  {
    id: "instructor-sara",
    url: "/media/instructors/sara.svg",
    alt: {
      en: "Portrait of Sara Fahmy",
      ar: "صورة سارة فهمي",
    },
    width: 480,
    height: 900,
  },
];
