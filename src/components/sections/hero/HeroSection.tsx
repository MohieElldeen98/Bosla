import { HeroCarousel } from "@/components/sections/hero/HeroCarousel";
import { HeroContent } from "@/components/sections/hero/HeroContent";
import { TrustBar } from "@/components/sections/hero/TrustBar";
import type { FullyResolvedHeroSectionContent } from "@/cms/types/section";

/**
 * The Hero, composed server-first (Performance Sprint 3, Candidate #3).
 * Only the carousel (portrait/floating card/navigation) needs client-side
 * state, isolated into `HeroCarousel` — the one Client Island. `HeroContent`
 * (the homepage's LCP `<h1>`) and `TrustBar` render as real server HTML: no
 * JS/hydration dependency for their own visibility, unlike the previous
 * all-client `Hero`. Everything is sourced from HomepageService.
 * getSections() → this component, never hardcoded.
 */
export function HeroSection({ content }: { content: FullyResolvedHeroSectionContent }) {
  return (
    <>
      <HeroCarousel slides={content.slides} heroContent={<HeroContent content={content} />} />
      <TrustBar statistics={content.statistics} />
    </>
  );
}
