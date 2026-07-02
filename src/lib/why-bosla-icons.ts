import {
  Award,
  FlaskConical,
  Languages,
  ListChecks,
  MonitorPlay,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

// Icon keys stored in the `why_bosla` CMS section content resolve here —
// same "store a name, not a component" pattern as src/lib/hero-icons.ts.
export const whyBoslaIcons: Record<string, LucideIcon> = {
  "evidence-based": FlaskConical,
  "clinical-skills": Stethoscope,
  "structured-learning": ListChecks,
  "expert-instructors": Award,
  bilingual: Languages,
  "modern-experience": MonitorPlay,
};

export function getWhyBoslaIcon(key: string): LucideIcon {
  return whyBoslaIcons[key] ?? Award;
}
