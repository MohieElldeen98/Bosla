import type { Locale } from "@/i18n/routing";
import { InstructorRepository } from "@/repositories/instructor.repository";
import { MediaService } from "@/services/media.service";
import type { InstructorSlide, ResolvedInstructorSlide } from "@/types/instructor";

async function resolve(
  slide: InstructorSlide,
  locale: Locale,
): Promise<ResolvedInstructorSlide> {
  return {
    id: slide.id,
    nameEn: slide.nameEn,
    nameAr: slide.nameAr,
    title: slide.title[locale],
    qualification: slide.qualification[locale],
    specialty: slide.specialty[locale],
    bio: slide.bio[locale],
    experienceYears: slide.experienceYears,
    studentsTaught: slide.studentsTaught,
    featuredCourseTitle: slide.featuredCourseTitle[locale],
    profileHref: slide.profileHref,
    image: await MediaService.getById(slide.imageId, locale),
  };
}

export const InstructorService = {
  async getFeaturedInstructors(
    locale: Locale,
  ): Promise<ResolvedInstructorSlide[]> {
    const slides = await InstructorRepository.findFeatured();
    return Promise.all(slides.map((slide) => resolve(slide, locale)));
  },

  async getById(
    id: string,
    locale: Locale,
  ): Promise<ResolvedInstructorSlide> {
    const slide = await InstructorRepository.findById(id);
    if (!slide) {
      throw new Error(`InstructorService: no instructor found for id "${id}"`);
    }
    return resolve(slide, locale);
  },
};
