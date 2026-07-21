import "server-only";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { CertificateRepository } from "@/certificates/repositories/certificate.repository";
import { canAccessStudentData } from "@/certificates/utils/require-student-access";
import { safeRead } from "@/certificates/utils/safe-operation";
import { CourseRepository } from "@/courses/repositories/course.repository";
import { ModuleRepository } from "@/learning/repositories/module.repository";
import { LessonRepository } from "@/learning/repositories/lesson.repository";
import { LessonProgressRepository } from "@/learning/repositories/lesson-progress.repository";
import { getCourseCompletionStatus } from "@/learning/types/course-completion-status";
import { logger } from "@/lib/logger";
import type { Certificate } from "@/certificates/types/certificate";
import type { CertificateActionResult } from "@/certificates/types/result";
import type { AuthUser } from "@/auth/types/session";

export interface CertificatePdfContext {
  studentName: string;
  courseTitle: string;
}

/**
 * Issuance and PDF rendering for `certificates` — mirrors `payments/
 * services/invoice.service.ts` exactly: `issueIfEligible` is strictly
 * once-per-(student, course) (the unique slot absorbs races — whoever
 * loses simply reads the winner's row), numbers come from the
 * collision-proof `certificate_number_seq` sequence formatted as
 * `CERT-<year>-<seq>`, and the PDF is rendered on demand, never
 * persisted.
 */
export const CertificateService = {
  /** Called right after a lesson is marked complete
   *  (`LessonProgressService.setCompleted`) — recomputes the *course's*
   *  completion status (not just the one lesson) and issues a
   *  certificate exactly once if the course just became fully complete
   *  and offers one. Silently a no-op otherwise; issuance failures are
   *  logged, never thrown — a certificate is a bonus on top of a
   *  successful lesson-completion write, not a condition of it (same
   *  "never turn a successful save into a reported error" reasoning
   *  `notify()` already uses). */
  async issueIfEligible(studentId: string, courseId: string): Promise<void> {
    try {
      const course = await CourseRepository.findById(courseId);
      if (!course || !course.certificateAvailable) return;

      const existing = await CertificateRepository.findByUserAndCourse(studentId, courseId);
      if (existing) return;

      const modules = await ModuleRepository.findByCourseId(courseId);
      const lessons = await LessonRepository.findByModuleIds(modules.map((module) => module.id));
      if (lessons.length === 0) return;

      const progress = await LessonProgressRepository.findByStudentAndLessonIds(
        studentId,
        lessons.map((lesson) => lesson.id),
      );
      const completedLessons = progress.filter((entry) => entry.completedAt !== null).length;
      const status = getCourseCompletionStatus(completedLessons, lessons.length);
      if (status !== "completed") return;

      const sequence = await CertificateRepository.nextSequenceValue();
      const certificateNumber = `CERT-${new Date().getUTCFullYear()}-${String(sequence).padStart(6, "0")}`;
      const { created, certificate } = await CertificateRepository.create({
        userId: studentId,
        courseId,
        certificateNumber,
      });
      if (created && certificate) {
        logger.info("[certificates] issued", { certificateId: certificate.id, certificateNumber, courseId, studentId });
      }
    } catch (error) {
      logger.error("[certificates] issueIfEligible failed", error);
    }
  },

  async getById(id: string): Promise<Certificate | null> {
    return safeRead(() => CertificateRepository.findById(id), null);
  },

  async listForStudent(actingUser: AuthUser, studentId: string): Promise<CertificateActionResult<Certificate[]>> {
    if (!canAccessStudentData(actingUser, studentId)) {
      return { success: false, code: "forbidden", message: "You cannot view this student's certificates." };
    }
    const list = await safeRead(() => CertificateRepository.findByUserId(studentId), []);
    return { success: true, data: list };
  },

  /** A clean single-page A4 certificate via `pdf-lib` — WinAnsi-safe
   *  text only, same reasoning `InvoiceService.renderPdf`'s doc comment
   *  gives (course titles/names can be Arabic, which Helvetica can't
   *  encode). */
  async renderPdf(certificate: Certificate, context: CertificatePdfContext): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const page = doc.addPage([841.89, 595.28]); // A4 landscape, points
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);

    const ink = rgb(0.07, 0.09, 0.15);
    const muted = rgb(0.42, 0.45, 0.5);
    const accent = rgb(0.28, 0.24, 0.68);
    const line = rgb(0.9, 0.91, 0.92);
    const margin = 64;
    const width = page.getWidth() - margin * 2;

    const sanitize = (value: string): string => value.replace(/[^ -~ -ÿ]/g, "").trim() || "—";

    const centered = (value: string, y: number, options: { size: number; bold?: boolean; color?: typeof ink }) => {
      const useFont = options.bold ? bold : font;
      const clean = sanitize(value);
      const x = (page.getWidth() - useFont.widthOfTextAtSize(clean, options.size)) / 2;
      page.drawText(clean, { x, y, size: options.size, font: useFont, color: options.color ?? ink });
    };

    page.drawRectangle({ x: 0, y: 0, width: page.getWidth(), height: page.getHeight(), borderColor: line, borderWidth: 2 });

    let y = page.getHeight() - 100;
    centered("Bosla", y, { size: 20, bold: true, color: accent });
    y -= 50;
    centered("Certificate of Completion", y, { size: 14, color: muted });
    y -= 70;
    centered("This certifies that", y, { size: 12, color: muted });
    y -= 36;
    centered(context.studentName, y, { size: 26, bold: true });
    y -= 40;
    centered("has successfully completed", y, { size: 12, color: muted });
    y -= 36;
    centered(context.courseTitle, y, { size: 18, bold: true });

    y -= 60;
    page.drawLine({ start: { x: margin, y }, end: { x: margin + width, y }, thickness: 1, color: line });
    y -= 24;
    centered(
      `${certificate.certificateNumber}  ·  Issued ${new Date(certificate.issuedAt).toISOString().slice(0, 10)}`,
      y,
      { size: 10, color: muted },
    );

    return doc.save();
  },
};
