import {
  Briefcase,
  Cloud,
  Code2,
  Palette,
  BrainCircuit,
  type LucideIcon,
} from "lucide-react";

export const categoryIcons: Record<string, LucideIcon> = {
  "Web Development": Code2,
  "Data Science": BrainCircuit,
  Design: Palette,
  DevOps: Cloud,
  Business: Briefcase,
};

export function getCategoryIcon(category: string): LucideIcon {
  return categoryIcons[category] ?? Code2;
}
