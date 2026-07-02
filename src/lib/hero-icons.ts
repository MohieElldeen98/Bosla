import {
  Award,
  Clock,
  FileCheck,
  FlaskConical,
  GraduationCap,
  PlayCircle,
  Star,
  Stethoscope,
  Users,
  type LucideIcon,
} from "lucide-react";

// Icon keys stored in the `hero` CMS section content (src/cms/types/section.ts)
// resolve here — mirrors the "store a name, not a component" pattern in
// src/lib/course-category.ts, since a CMS record can only store a string,
// never a React component reference.
export const heroIcons: Record<string, LucideIcon> = {
  // Highlights (qualitative)
  evidence: FlaskConical,
  practical: Stethoscope,
  anytime: Clock,
  certificate: FileCheck,
  // Floating instructor card fields
  qualification: GraduationCap,
  specialty: Stethoscope,
  experience: Award,
  students: Users,
  // Trust Bar statistics (quantitative)
  professionals: GraduationCap,
  courses: PlayCircle,
  instructors: Users,
  rating: Star,
};

export function getHeroIcon(key: string): LucideIcon {
  return heroIcons[key] ?? Award;
}
