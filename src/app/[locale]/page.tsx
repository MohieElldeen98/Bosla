import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/sections/hero-section";
import { FeaturedCourses } from "@/components/sections/featured-courses";
import { WhyKnowledgeOs } from "@/components/sections/why-knowledge-os";
import { LearningExperience } from "@/components/sections/learning-experience";
import { Testimonials } from "@/components/sections/testimonials";
import { FaqSection } from "@/components/sections/faq-section";
import { CtaSection } from "@/components/sections/cta-section";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="skip-link sr-only">
        Skip to content
      </a>
      <Navbar />
      <main id="main-content" className="flex-1">
        <HeroSection />
        <FeaturedCourses />
        <WhyKnowledgeOs />
        <LearningExperience />
        <Testimonials />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
