import { SpecialtyRepository } from "@/courses/repositories/specialty.repository";
import { requireCourseManagementAccess } from "@/courses/utils/require-course-access";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { safeMutation, safeRead } from "@/courses/utils/safe-operation";
import type { Locale } from "@/i18n/routing";
import type { NewSpecialtyInput, ResolvedSpecialty, Specialty } from "@/courses/types/specialty";
import type { CourseActionResult } from "@/courses/types/result";
import type { UpdateSpecialtyInput } from "@/courses/validators/specialty.validator";

function toResolvedSpecialty(specialty: Specialty, locale: Locale): ResolvedSpecialty {
  return {
    id: specialty.id,
    slug: specialty.slug,
    name: resolveLocalizedText(specialty.name, locale),
    description: resolveLocalizedText(specialty.description, locale),
    icon: specialty.icon,
    isActive: specialty.isActive,
    displayOrder: specialty.displayOrder,
  };
}

/**
 * Orchestration for `specialties` — authorization on every mutation,
 * uniqueness on `slug`, locale resolution for reads. `SpecialtyRepository`
 * is pure data access. Mirrors `cms/services/page.service.ts`'s shape
 * exactly (own domain, own `requireCourseManagementAccess` gate).
 */
export const SpecialtyService = {
  async getById(id: string): Promise<Specialty | null> {
    return safeRead(() => SpecialtyRepository.findById(id), null);
  },

  async getBySlug(slug: string): Promise<Specialty | null> {
    return safeRead(() => SpecialtyRepository.findBySlug(slug), null);
  },

  async list(): Promise<Specialty[]> {
    return safeRead(() => SpecialtyRepository.findAll(), []);
  },

  async getResolvedBySlug(slug: string, locale: Locale): Promise<ResolvedSpecialty | null> {
    const specialty = await safeRead(() => SpecialtyRepository.findBySlug(slug), null);
    return specialty ? toResolvedSpecialty(specialty, locale) : null;
  },

  async listResolved(locale: Locale): Promise<ResolvedSpecialty[]> {
    const list = await safeRead(() => SpecialtyRepository.findAll(), []);
    return list.map((specialty) => toResolvedSpecialty(specialty, locale));
  },

  async create(input: NewSpecialtyInput): Promise<CourseActionResult<Specialty>> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage the course catalog." };
      }
      const existing = await SpecialtyRepository.findBySlug(input.slug);
      if (existing) {
        return {
          success: false,
          code: "conflict",
          message: `A specialty with slug "${input.slug}" already exists.`,
        };
      }
      const created = await SpecialtyRepository.create(input);
      return { success: true, data: created };
    });
  },

  async update(id: string, input: UpdateSpecialtyInput): Promise<CourseActionResult<Specialty>> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage the course catalog." };
      }
      const updated = await SpecialtyRepository.update(id, input);
      if (!updated) {
        return { success: false, code: "not_found", message: "Specialty not found." };
      }
      return { success: true, data: updated };
    });
  },

  async delete(id: string): Promise<CourseActionResult> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage the course catalog." };
      }
      await SpecialtyRepository.delete(id);
      return { success: true, data: undefined };
    });
  },
};
