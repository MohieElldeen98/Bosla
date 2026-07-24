import { CategoryRepository } from "@/courses/repositories/category.repository";
import { requireCourseManagementAccess } from "@/courses/utils/require-course-access";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { recordCategoryAuditLog } from "@/courses/utils/audit-log";
import { safeMutation, safeRead } from "@/courses/utils/safe-operation";
import type { Locale } from "@/i18n/routing";
import type { Category, NewCategoryInput, ResolvedCategory } from "@/courses/types/category";
import type { CourseActionResult } from "@/courses/types/result";
import type { UpdateCategoryInput } from "@/courses/validators/category.validator";

function toResolvedCategory(category: Category, locale: Locale): ResolvedCategory {
  return {
    id: category.id,
    slug: category.slug,
    name: resolveLocalizedText(category.name, locale),
    description: resolveLocalizedText(category.description, locale),
    icon: category.icon,
    specialtyId: category.specialtyId,
    isActive: category.isActive,
    displayOrder: category.displayOrder,
  };
}

/**
 * Orchestration for `categories` — authorization on every mutation,
 * uniqueness on `slug`, locale resolution for reads.
 * `CategoryRepository` is pure data access.
 */
export const CategoryService = {
  async getById(id: string): Promise<Category | null> {
    return safeRead(() => CategoryRepository.findById(id), null);
  },

  async getBySlug(slug: string): Promise<Category | null> {
    return safeRead(() => CategoryRepository.findBySlug(slug), null);
  },

  async list(): Promise<Category[]> {
    return safeRead(() => CategoryRepository.findAll(), []);
  },

  async listBySpecialtyId(specialtyId: string): Promise<Category[]> {
    return safeRead(() => CategoryRepository.findBySpecialtyId(specialtyId), []);
  },

  async listResolved(locale: Locale): Promise<ResolvedCategory[]> {
    const list = await safeRead(() => CategoryRepository.findAll(), []);
    return list.map((category) => toResolvedCategory(category, locale));
  },

  async create(input: NewCategoryInput): Promise<CourseActionResult<Category>> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage the course catalog." };
      }
      const existing = await CategoryRepository.findBySlug(input.slug);
      if (existing) {
        return {
          success: false,
          code: "conflict",
          message: `A category with slug "${input.slug}" already exists.`,
        };
      }
      const created = await CategoryRepository.create(input);
      await recordCategoryAuditLog({ action: "create", categoryId: created.id, actorId: user.id });
      return { success: true, data: created };
    });
  },

  async update(id: string, input: UpdateCategoryInput): Promise<CourseActionResult<Category>> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage the course catalog." };
      }
      if (input.slug) {
        const existing = await CategoryRepository.findBySlug(input.slug);
        if (existing && existing.id !== id) {
          return {
            success: false,
            code: "conflict",
            message: `A category with slug "${input.slug}" already exists.`,
          };
        }
      }
      const updated = await CategoryRepository.update(id, input);
      if (!updated) {
        return { success: false, code: "not_found", message: "Category not found." };
      }
      await recordCategoryAuditLog({ action: "update", categoryId: id, actorId: user.id });
      return { success: true, data: updated };
    });
  },

  /** The audit row is written before the delete (not after) since
   *  `category_audit_logs` cascades on `category_id` — logging after the
   *  row is gone would have nothing to attach to (matches
   *  `CourseService.delete`'s/`ArticleService.delete`'s own precedent). */
  async delete(id: string): Promise<CourseActionResult> {
    return safeMutation(async () => {
      const user = await requireCourseManagementAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage the course catalog." };
      }
      await recordCategoryAuditLog({ action: "delete", categoryId: id, actorId: user.id });
      await CategoryRepository.delete(id);
      return { success: true, data: undefined };
    });
  },
};
