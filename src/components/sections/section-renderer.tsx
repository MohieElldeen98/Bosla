import { Hero } from "@/components/sections/hero/Hero";
import { FeaturedCourses } from "@/components/sections/featured-courses";
import { WhyKnowledgeOs } from "@/components/sections/why-knowledge-os";
import { LearningExperience } from "@/components/sections/learning-experience";
import { Testimonials } from "@/components/sections/testimonials";
import { FaqSection } from "@/components/sections/faq-section";
import { CtaSection } from "@/components/sections/cta-section";
import type { HomepageSection } from "@/types/homepage";
import type {
  FullyResolvedHeroSectionContent,
  ResolvedCtaSectionContent,
  ResolvedFaqSectionContent,
  ResolvedFeaturedCoursesSectionContent,
  ResolvedLearningExperienceSectionContent,
  ResolvedTestimonialsSectionContent,
  ResolvedWhyBoslaSectionContent,
} from "@/cms/types/section";

/**
 * Maps a resolved HomepageSection to its React component by `type`. This is
 * the one place that needs to change when a new section type is introduced —
 * the homepage itself just iterates HomepageService.getSections() in order.
 */
export function SectionRenderer({ section }: { section: HomepageSection }) {
  switch (section.type) {
    case "hero":
      return <Hero content={section.content as FullyResolvedHeroSectionContent} />;
    case "featuredCourses":
      return <FeaturedCourses content={section.content as ResolvedFeaturedCoursesSectionContent} />;
    case "whyBosla":
      return <WhyKnowledgeOs content={section.content as ResolvedWhyBoslaSectionContent} />;
    case "learningExperience":
      return (
        <LearningExperience content={section.content as ResolvedLearningExperienceSectionContent} />
      );
    case "testimonials":
      return <Testimonials content={section.content as ResolvedTestimonialsSectionContent} />;
    case "faq":
      return <FaqSection content={section.content as ResolvedFaqSectionContent} />;
    case "cta":
      return <CtaSection content={section.content as ResolvedCtaSectionContent} />;
    default:
      return null;
  }
}
