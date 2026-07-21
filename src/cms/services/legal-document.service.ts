import "server-only";

import { getDb } from "@/db";
import { LegalDocumentRepository } from "@/cms/repositories/legal-document.repository";
import { LegalDocumentVersionRepository } from "@/cms/repositories/legal-document-version.repository";
import { sanitizeLegalHtml } from "@/cms/utils/sanitize-legal-html";
import { buildLegalToc } from "@/cms/utils/legal-toc";
import { buildLegalTokenMap, substituteLegalTokens } from "@/cms/utils/legal-tokens";
import { requireCmsAccess } from "@/cms/utils/require-cms-access";
import { safeMutation, safeRead } from "@/cms/utils/safe-operation";
import { updateLegalDocumentSchema } from "@/cms/validators/legal-document.validator";
import { CmsSiteSettingsService } from "@/cms/services/site-settings.service";
import { resolveContactSettings } from "@/cms/utils/resolve-contact-settings";
import type { Locale } from "@/i18n/routing";
import type { CmsActionResult } from "@/cms/types/result";
import type { LegalDocument, ResolvedLegalDocument } from "@/cms/types/legal-document";

/**
 * Orchestration for `legal_documents` (docs/legal-content-platform.md
 * §Static Content CMS). `getPublishedBySlug` is the ONE unauthenticated
 * read — it's what every public legal page renders, and it only ever
 * returns a `published: true` row, so an in-progress draft edit can
 * never leak onto `/privacy`/`/terms`/`/refunds`. Every mutation is
 * admin-gated via `requireCmsAccess`, the same guard the rest of the
 * CMS domain uses (legal content management IS content management).
 */
export const LegalDocumentService = {
  /** Public — no auth check, matches `HomepageService.getSections`'s
   *  "reads are unrestricted" convention. Returns `null` for a slug
   *  that doesn't exist OR has never been published; the page renders a
   *  404 either way, same "the page can't tell those apart and
   *  shouldn't" reasoning `CourseService.getPublicDetailBySlug` uses. */
  async getPublishedBySlug(slug: string, locale: Locale): Promise<ResolvedLegalDocument | null> {
    const document = await safeRead(() => LegalDocumentRepository.findBySlug(slug), null);
    if (!document || !document.published || !document.publishedAt) return null;

    const contactRaw = await safeRead(() => CmsSiteSettingsService.get("contact"), null);
    const contact = resolveContactSettings(contactRaw, locale);
    const tokens = buildLegalTokenMap(contact, "Bosla");

    const rawHtml = locale === "ar" ? document.contentAr : document.contentEn;
    const substituted = substituteLegalTokens(rawHtml, tokens);
    const { html, toc } = buildLegalToc(substituted);
    const title = substituteLegalTokens(locale === "ar" ? document.titleAr : document.titleEn, tokens);

    return {
      slug: document.slug,
      title,
      html,
      toc,
      version: document.version,
      publishedAt: document.publishedAt,
    };
  },

  /** `/admin/content`'s listing. */
  async getAllForAdmin(): Promise<CmsActionResult<LegalDocument[]>> {
    const user = await requireCmsAccess();
    if (!user) {
      return { success: false, code: "forbidden", message: "You cannot manage legal content." };
    }
    const documents = await safeRead(() => LegalDocumentRepository.findAll(), []);
    return { success: true, data: documents };
  },

  /** `/admin/content/[slug]`'s editor load. */
  async getByIdForAdmin(id: string): Promise<CmsActionResult<LegalDocument>> {
    const user = await requireCmsAccess();
    if (!user) {
      return { success: false, code: "forbidden", message: "You cannot manage legal content." };
    }
    const document = await safeRead(() => LegalDocumentRepository.findById(id), null);
    if (!document) {
      return { success: false, code: "not_found", message: "Document not found." };
    }
    return { success: true, data: document };
  },

  /** Saves without publishing — the public pages keep serving the
   *  previously published version until `publish` runs. */
  async saveDraft(id: string, rawInput: unknown): Promise<CmsActionResult<LegalDocument>> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage legal content." };
      }
      const parsed = updateLegalDocumentSchema.safeParse(rawInput);
      if (!parsed.success) {
        return {
          success: false,
          code: "validation_failed",
          message: parsed.error.issues.map((issue) => issue.message).join(" "),
        };
      }
      const updated = await LegalDocumentRepository.saveDraft(
        id,
        {
          titleEn: parsed.data.titleEn,
          titleAr: parsed.data.titleAr,
          contentEn: sanitizeLegalHtml(parsed.data.contentEn),
          contentAr: sanitizeLegalHtml(parsed.data.contentAr),
        },
        user.id,
      );
      if (!updated) {
        return { success: false, code: "not_found", message: "Document not found." };
      }
      return { success: true, data: updated };
    });
  },

  /** Saves the draft AND publishes it in one step, bumping `version`
   *  and stamping `publishedAt` — the admin editor's "Publish" button
   *  (as opposed to "Save Draft", which only calls `saveDraft`). */
  async publish(id: string, rawInput: unknown): Promise<CmsActionResult<LegalDocument>> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage legal content." };
      }
      const parsed = updateLegalDocumentSchema.safeParse(rawInput);
      if (!parsed.success) {
        return {
          success: false,
          code: "validation_failed",
          message: parsed.error.issues.map((issue) => issue.message).join(" "),
        };
      }
      return getDb().transaction(async (tx) => {
        const current = await LegalDocumentRepository.findById(id, tx);
        if (!current) {
          return { success: false, code: "not_found", message: "Document not found." };
        }
        await LegalDocumentRepository.saveDraft(
          id,
          {
            titleEn: parsed.data.titleEn,
            titleAr: parsed.data.titleAr,
            contentEn: sanitizeLegalHtml(parsed.data.contentEn),
            contentAr: sanitizeLegalHtml(parsed.data.contentAr),
          },
          user.id,
          tx,
        );
        const published = await LegalDocumentRepository.publish(id, current.version + 1, user.id, tx);
        if (!published) {
          return { success: false, code: "not_found", message: "Document not found." };
        }
        await LegalDocumentVersionRepository.createSnapshot(published, user.id, tx);
        return { success: true, data: published };
      });
    });
  },
};
