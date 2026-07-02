import { instructorsMock } from "@/mock/instructors.mock";
import type { InstructorSlide } from "@/types/instructor";

/**
 * Data-access layer for instructors. Reads from an in-memory mock array
 * today; a future Phase would swap this file's internals for a Drizzle query
 * against `instructor_profiles` (see docs/database-overview.md §1) without
 * changing InstructorService or any component.
 */
export const InstructorRepository = {
  async findAll(): Promise<InstructorSlide[]> {
    return instructorsMock;
  },

  async findFeatured(): Promise<InstructorSlide[]> {
    return instructorsMock
      .filter((instructor) => instructor.isFeatured)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  },

  async findById(id: string): Promise<InstructorSlide | undefined> {
    return instructorsMock.find((instructor) => instructor.id === id);
  },
};
