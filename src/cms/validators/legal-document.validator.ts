import { z } from "zod";

/** `/admin/content/[slug]`'s editor save/publish input — both title
 *  fields required for both locales (a legal document must always be
 *  complete in both languages before it can be saved, unlike an article
 *  which is deliberately single-language). Content length is generous
 *  (legal documents are long) but bounded to guard against a runaway
 *  editor paste. */
export const updateLegalDocumentSchema = z.object({
  titleEn: z.string().trim().min(1).max(200),
  titleAr: z.string().trim().min(1).max(200),
  contentEn: z.string().trim().min(1).max(200_000),
  contentAr: z.string().trim().min(1).max(200_000),
});
export type UpdateLegalDocumentInput = z.infer<typeof updateLegalDocumentSchema>;
