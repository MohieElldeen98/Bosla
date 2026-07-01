export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  instructor: {
    name: string;
    avatarInitials: string;
  };
  level: "Beginner" | "Intermediate" | "Advanced";
  durationHours: number;
  lessonCount: number;
  studentCount: number;
  rating: number;
  price: number;
  originalPrice?: number;
  imageGradient: string;
  tag?: "Bestseller" | "New";
}
