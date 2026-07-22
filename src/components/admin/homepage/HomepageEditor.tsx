"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PageTitle } from "@/components/admin/PageTitle";
import { MoveButtons } from "@/components/admin/homepage/MoveButtons";
import { SectionEnableToggle } from "@/components/admin/homepage/SectionEnableToggle";
import { SeoForm } from "@/components/admin/homepage/SeoForm";
import { HeroSectionForm } from "@/components/admin/homepage/sections/HeroSectionForm";
import { FeaturedCoursesSectionForm } from "@/components/admin/homepage/sections/FeaturedCoursesSectionForm";
import { WhyBoslaSectionForm } from "@/components/admin/homepage/sections/WhyBoslaSectionForm";
import { LearningExperienceSectionForm } from "@/components/admin/homepage/sections/LearningExperienceSectionForm";
import { TestimonialsSectionForm } from "@/components/admin/homepage/sections/TestimonialsSectionForm";
import { FaqSectionForm } from "@/components/admin/homepage/sections/FaqSectionForm";
import { CtaSectionForm } from "@/components/admin/homepage/sections/CtaSectionForm";
import { reorderSectionsAction } from "@/cms/actions/section.actions";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import type {
  CmsSection,
  CmsSectionType,
  CtaSectionContent,
  FaqSectionContent,
  FeaturedCoursesSectionContent,
  HeroSectionContent,
  LearningExperienceSectionContent,
  TestimonialsSectionContent,
  WhyBoslaSectionContent,
} from "@/cms/types/section";
import type { SeoMeta } from "@/cms/types/seo";

const SECTION_TITLE_KEY: Partial<Record<CmsSectionType, string>> = {
  hero: "hero",
  featured_courses: "featuredCourses",
  why_bosla: "whyBosla",
  learning_experience: "learningExperience",
  testimonials: "testimonials",
  faq: "faq",
  cta: "cta",
};

function renderSectionForm(
  section: CmsSection,
  onSaved: (content: unknown) => void,
  onDirtyChange: (dirty: boolean) => void,
) {
  // `updatedAt` seeds each form's own optimistic-concurrency baseline
  // (Step 6.6 — docs/cms-overview.md §16) once, at mount; every save after
  // that is tracked internally by the form's own `useSaveContent` state,
  // not re-threaded through this parent, since the form never unmounts
  // between saves (stable `key={section.id}` on its `AccordionItem`).
  switch (section.sectionType) {
    case "hero":
      return (
        <HeroSectionForm
          sectionId={section.id}
          content={section.content as HeroSectionContent}
          updatedAt={section.updatedAt}
          onSaved={onSaved}
          onDirtyChange={onDirtyChange}
        />
      );
    case "featured_courses":
      return (
        <FeaturedCoursesSectionForm
          sectionId={section.id}
          content={section.content as FeaturedCoursesSectionContent}
          updatedAt={section.updatedAt}
          onSaved={onSaved}
          onDirtyChange={onDirtyChange}
        />
      );
    case "why_bosla":
      return (
        <WhyBoslaSectionForm
          sectionId={section.id}
          content={section.content as WhyBoslaSectionContent}
          updatedAt={section.updatedAt}
          onSaved={onSaved}
          onDirtyChange={onDirtyChange}
        />
      );
    case "learning_experience":
      return (
        <LearningExperienceSectionForm
          sectionId={section.id}
          content={section.content as LearningExperienceSectionContent}
          updatedAt={section.updatedAt}
          onSaved={onSaved}
          onDirtyChange={onDirtyChange}
        />
      );
    case "testimonials":
      return (
        <TestimonialsSectionForm
          sectionId={section.id}
          content={section.content as TestimonialsSectionContent}
          updatedAt={section.updatedAt}
          onSaved={onSaved}
          onDirtyChange={onDirtyChange}
        />
      );
    case "faq":
      return (
        <FaqSectionForm
          sectionId={section.id}
          content={section.content as FaqSectionContent}
          updatedAt={section.updatedAt}
          onSaved={onSaved}
          onDirtyChange={onDirtyChange}
        />
      );
    case "cta":
      return (
        <CtaSectionForm
          sectionId={section.id}
          content={section.content as CtaSectionContent}
          updatedAt={section.updatedAt}
          onSaved={onSaved}
          onDirtyChange={onDirtyChange}
        />
      );
    default:
      return null;
  }
}

export function HomepageEditor({
  pageId,
  initialSections,
  seoMetaId,
  initialSeo,
}: {
  pageId: string;
  initialSections: CmsSection[];
  seoMetaId: string | null;
  initialSeo: SeoMeta | null;
}) {
  const t = useTranslations("Admin.homepageEditor");
  const [sections, setSections] = useState(initialSections);
  const [dirtyMap, setDirtyMap] = useState<Record<string, boolean>>({});
  const [seoDirty, setSeoDirty] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  const hasUnsavedChanges = seoDirty || Object.values(dirtyMap).some(Boolean);

  useUnsavedChangesGuard(hasUnsavedChanges, t("leaveConfirm"));

  const setSectionDirty = useCallback((sectionId: string, dirty: boolean) => {
    setDirtyMap((prev) => (prev[sectionId] === dirty ? prev : { ...prev, [sectionId]: dirty }));
  }, []);

  function handleSectionSaved(sectionId: string, content: unknown) {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId ? ({ ...section, content } as CmsSection) : section,
      ),
    );
  }

  function handleToggled(sectionId: string, isEnabled: boolean) {
    setSections((prev) =>
      prev.map((section) => (section.id === sectionId ? { ...section, isEnabled } : section)),
    );
  }

  async function moveSection(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sections.length || isReordering) return;

    const reordered = [...sections];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    const previous = sections;
    setSections(reordered);
    setIsReordering(true);

    try {
      const result = await reorderSectionsAction({
        pageId,
        orderedSectionIds: reordered.map((section) => section.id),
      });
      if (!result.success) {
        setSections(previous);
        toast.error(result.message);
        return;
      }
    } catch {
      setSections(previous);
      toast.error(t("networkError"));
    } finally {
      setIsReordering(false);
    }
  }

  const seoDefault = useMemo<SeoMeta>(
    () =>
      initialSeo ?? {
        id: seoMetaId ?? "",
        title: null,
        description: null,
        updatedAt: new Date(0).toISOString(),
        ogImageId: null,
        canonicalPath: null,
      },
    [initialSeo, seoMetaId],
  );

  return (
    <div className="space-y-6">
      <PageTitle title={t("pageTitle")} description={t("pageDescription")} />

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">{t("sectionsOverviewTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("sectionsOverviewDescription")}</p>
        </div>

        <Accordion>
          {sections.map((section, index) => {
            const titleKey = SECTION_TITLE_KEY[section.sectionType];
            const title = titleKey ? t(`sections.${titleKey}.title`) : section.sectionType;
            const description = titleKey ? t(`sections.${titleKey}.description`) : undefined;

            return (
              <AccordionItem key={section.id} value={section.id}>
                <div className="flex items-center gap-2">
                  <MoveButtons
                    onMoveUp={() => moveSection(index, -1)}
                    onMoveDown={() => moveSection(index, 1)}
                    disableUp={index === 0 || isReordering}
                    disableDown={index === sections.length - 1 || isReordering}
                    moveUpLabel={t("moveSectionUp")}
                    moveDownLabel={t("moveSectionDown")}
                  />
                  <AccordionTrigger className="flex-1">
                    <span>
                      <span className="block">{title}</span>
                      {description && (
                        <span className="block text-xs font-normal text-muted-foreground">
                          {description}
                        </span>
                      )}
                    </span>
                  </AccordionTrigger>
                  <SectionEnableToggle
                    sectionId={section.id}
                    isEnabled={section.isEnabled}
                    onToggled={(next) => handleToggled(section.id, next)}
                  />
                </div>
                <AccordionContent>
                  {renderSectionForm(
                    section,
                    (content) => handleSectionSaved(section.id, content),
                    (dirty) => setSectionDirty(section.id, dirty),
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      {seoMetaId && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-foreground">{t("seo.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("seo.description")}</p>
          </div>
          <SeoForm
            pageId={pageId}
            seoMetaId={seoMetaId}
            seo={seoDefault}
            onSaved={() => setSeoDirty(false)}
            onDirtyChange={setSeoDirty}
          />
        </div>
      )}
    </div>
  );
}
