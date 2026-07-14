import {
  Activity,
  Apple,
  Baby,
  Bone,
  Brain,
  Dumbbell,
  Ear,
  Eye,
  Footprints,
  Hand,
  HeartPulse,
  Microscope,
  MoreHorizontal,
  Pill,
  Salad,
  Stethoscope,
  Syringe,
  Tag,
  type LucideIcon,
} from "lucide-react";

/**
 * Icon keys stored in `article_categories.icon` resolve here — the same
 * "store a name, not a component" pattern as `src/lib/hero-icons.ts`. The
 * key set is medical-editorial (what blog topics are actually about); an
 * unknown/missing key falls back to a generic tag, so a typo in the admin
 * form degrades gracefully instead of crashing a public page.
 */
export const blogCategoryIcons: Record<string, LucideIcon> = {
  activity: Activity,
  nutrition: Apple,
  pediatrics: Baby,
  bone: Bone,
  neurology: Brain,
  exercise: Dumbbell,
  ear: Ear,
  eye: Eye,
  gait: Footprints,
  hand: Hand,
  cardiology: HeartPulse,
  research: Microscope,
  other: MoreHorizontal,
  pharmacology: Pill,
  diet: Salad,
  clinical: Stethoscope,
  injection: Syringe,
};

export function getBlogCategoryIcon(key: string | null): LucideIcon {
  return (key && blogCategoryIcons[key]) || Tag;
}
