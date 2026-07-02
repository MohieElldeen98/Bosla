import { Activity, Apple, type LucideIcon } from "lucide-react";

export const categoryIcons: Record<string, LucideIcon> = {
  Physiotherapy: Activity,
  Nutrition: Apple,
};

export function getCategoryIcon(category: string): LucideIcon {
  return categoryIcons[category] ?? Activity;
}
