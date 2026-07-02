"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
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
import {
  getPublishStatusAction,
  publishPageAction,
  revertToPublishedAction,
} from "@/cms/actions/page-version.actions";
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
import type { CmsPagePublishStatus } from "@/cms/types/page-version";
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
  initialStatus,
}: {
  pageId: string;
  initialSections: CmsSection[];
  seoMetaId: string | null;
  initialSeo: SeoMeta | null;
  initialStatus: CmsPagePublishStatus;
}) {
  const t = useTranslations("Admin.homepageEditor");
  const locale = useLocale();
  const [sections, setSections] = useState(initialSections);
  const [dirtyMap, setDirtyMap] = useState<Record<string, boolean>>({});
  const [seoDirty, setSeoDirty] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [status, setStatus] = useState(initialStatus);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isReverting, setIsReverting] = useState(false);

  const hasUnsavedChanges = seoDirty || Object.values(dirtyMap).some(Boolean);

  useUnsavedChangesGuard(hasUnsavedChanges, t("leaveConfirm"));

  async function handlePublish() {
    if (hasUnsavedChanges && !window.confirm(t("publishUnsavedConfirm"))) return;

    setIsPublishing(true);
    try {
      const result = await publishPageAction(pageId, status.publishedVersion);
      if (!result.success) {
        if (result.code === "conflict") {
          toast.error(t("publishConflict"));
          setStatus(await getPublishStatusAction(pageId));
        } else {
          toast.error(result.message || t("publishError"));
        }
        return;
      }
      toast.success(t("publishSuccess"));
      setStatus({
        isPublished: true,
        publishedVersion: result.data.version,
        publishedAt: result.data.publishedAt,
        hasUnpublishedChanges: false,
      });
    } catch {
      toast.error(t("networkError"));
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleRevert() {
    if (!window.confirm(t("revertConfirm"))) return;

    setIsReverting(true);
    try {
      const result = await revertToPublishedAction(pageId, status.publishedVersion);
      if (!result.success) {
        if (result.code === "conflict") {
          toast.error(t("revertConflict"));
          setStatus(await getPublishStatusAction(pageId));
        } else {
          toast.error(result.message || t("revertError"));
        }
        return;
      }
      toast.success(t("revertSuccess"));
      window.location.reload();
    } catch {
      toast.error(t("networkError"));
    } finally {
      setIsReverting(false);
    }
  }

  const setSectionDirty = useCallback((sectionId: string, dirty: boolean) => {
    setDirtyMap((prev) => (prev[sectionId] === dirty ? prev : { ...prev, [sectionId]: dirty }));
  }, []);

  const markUnpublishedChanges = useCallback(() => {
    setStatus((prev) => (prev.hasUnpublishedChanges ? prev : { ...prev, hasUnpublishedChanges: true }));
  }, []);

  function handleSectionSaved(sectionId: string, content: unknown) {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId ? ({ ...section, content } as CmsSection) : section,
      ),
    );
    markUnpublishedChanges();
  }

  function handleToggled(sectionId: string, isEnabled: boolean) {
    setSections((prev) =>
      prev.map((section) => (section.id === sectionId ? { ...section, isEnabled } : section)),
    );
    markUnpublishedChanges();
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
      markUnpublishedChanges();
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

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="text-sm text-muted-foreground">
          {status.isPublished ? (
            <>
              <span className="font-medium text-foreground">
                {t("publishStatus.published", { version: status.publishedVersion ?? 0 })}
              </span>
              {status.publishedAt && (
                <span>
                  {" "}
                  —{" "}
                  {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
                    new Date(status.publishedAt),
                  )}
                </span>
              )}
              {status.hasUnpublishedChanges && (
                <span className="ms-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
                  {t("publishStatus.unpublishedChanges")}
                </span>
              )}
            </>
          ) : (
            <span>{t("publishStatus.neverPublished")}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/admin/homepage/preview" target="_blank" rel="noopener noreferrer" />}
          >
            {t("preview")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRevert}
            disabled={!status.isPublished || isReverting || isPublishing}
          >
            {isReverting ? t("reverting") : t("revert")}
          </Button>
          <Button size="sm" onClick={handlePublish} disabled={isPublishing || isReverting}>
            {isPublishing ? t("publishing") : t("publish")}
          </Button>
        </div>
      </div>

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
            onSaved={() => {
              setSeoDirty(false);
              markUnpublishedChanges();
            }}
            onDirtyChange={setSeoDirty}
          />
        </div>
      )}
    </div>
  );
}
