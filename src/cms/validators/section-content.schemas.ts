import { z } from "zod";
import {
  cmsIconKeySchema,
  cmsLinkSchema,
  localizedRichTextSchema,
  localizedTextSchema,
} from "@/cms/validators/content-blocks.validator";
import type { CmsSectionType } from "@/cms/types/section";

const heroContentSchema = z.object({
  eyebrow: localizedTextSchema,
  headlineLine1: localizedTextSchema,
  headlineLine2: localizedTextSchema,
  headlineLine3: localizedTextSchema,
  description: localizedTextSchema,
  imageId: z.string().optional(),
  primaryButton: cmsLinkSchema,
  secondaryButton: cmsLinkSchema.optional(),
  highlights: z.array(
    z.object({ id: z.string().min(1), icon: cmsIconKeySchema, label: localizedTextSchema }),
  ),
  statistics: z.array(
    z.object({
      id: z.string().min(1),
      icon: cmsIconKeySchema,
      value: z.string().min(1),
      label: localizedTextSchema,
    }),
  ),
  slides: z.array(z.object({ id: z.string().min(1), instructorId: z.string().min(1) })),
});

const featuredInstructorsContentSchema = z.object({
  eyebrow: localizedTextSchema,
  title: localizedTextSchema,
  subtitle: localizedTextSchema.optional(),
  maxItems: z.number().int().min(1).max(50).optional(),
});

const featuredCoursesContentSchema = z.object({
  eyebrow: localizedTextSchema,
  title: localizedTextSchema,
  subtitle: localizedTextSchema.optional(),
  maxItems: z.number().int().min(1).max(50).optional(),
});

const categoriesContentSchema = z.object({
  eyebrow: localizedTextSchema,
  title: localizedTextSchema,
  subtitle: localizedTextSchema.optional(),
  items: z.array(
    z.object({
      id: z.string().min(1),
      icon: cmsIconKeySchema,
      label: localizedTextSchema,
      href: z.string().min(1),
      imageId: z.string().optional(),
    }),
  ),
});

const whyBoslaContentSchema = z.object({
  eyebrow: localizedTextSchema,
  title: localizedTextSchema,
  subtitle: localizedTextSchema,
  items: z.array(
    z.object({
      id: z.string().min(1),
      icon: cmsIconKeySchema,
      title: localizedTextSchema,
      description: localizedTextSchema,
    }),
  ),
});

const learningExperienceContentSchema = z.object({
  eyebrow: localizedTextSchema,
  title: localizedTextSchema,
  subtitle: localizedTextSchema,
  capabilities: z.array(z.object({ id: z.string().min(1), label: localizedTextSchema })),
});

const testimonialsContentSchema = z.object({
  eyebrow: localizedTextSchema,
  title: localizedTextSchema,
  subtitle: localizedTextSchema.optional(),
});

const faqContentSchema = z.object({
  eyebrow: localizedTextSchema,
  title: localizedTextSchema,
  items: z.array(
    z.object({
      id: z.string().min(1),
      question: localizedTextSchema,
      answer: localizedRichTextSchema,
    }),
  ),
});

const statisticsContentSchema = z.object({
  eyebrow: localizedTextSchema,
  title: localizedTextSchema,
  items: z.array(
    z.object({
      id: z.string().min(1),
      icon: cmsIconKeySchema,
      value: z.string().min(1),
      label: localizedTextSchema,
    }),
  ),
});

const ctaContentSchema = z.object({
  title: localizedTextSchema,
  subtitle: localizedTextSchema.optional(),
  primaryButton: cmsLinkSchema,
  secondaryButton: cmsLinkSchema.optional(),
  backgroundImageId: z.string().optional(),
});

/**
 * The generic CMS infrastructure this step asks for, concretely: one
 * lookup, keyed by `CmsSectionType`, that every repository/service method
 * validates `content` against — adding a ninth section type later means
 * adding one entry here (and to `CMS_SECTION_TYPES` /
 * `cms_section_type` the Postgres enum), never touching the
 * repository/service/action code that reads this registry.
 */
export const CMS_SECTION_CONTENT_SCHEMAS = {
  hero: heroContentSchema,
  featured_instructors: featuredInstructorsContentSchema,
  featured_courses: featuredCoursesContentSchema,
  categories: categoriesContentSchema,
  why_bosla: whyBoslaContentSchema,
  learning_experience: learningExperienceContentSchema,
  testimonials: testimonialsContentSchema,
  faq: faqContentSchema,
  statistics: statisticsContentSchema,
  cta: ctaContentSchema,
} satisfies Record<CmsSectionType, z.ZodType>;

export function validateSectionContent(sectionType: CmsSectionType, content: unknown) {
  return CMS_SECTION_CONTENT_SCHEMAS[sectionType].safeParse(content);
}
