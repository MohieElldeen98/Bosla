import { NextResponse } from "next/server";
import { SessionService } from "@/auth/services/session.service";
import { ProfileService } from "@/auth/services/profile.service";
import { CourseRepository } from "@/courses/repositories/course.repository";
import { canAccessStudentData } from "@/certificates/utils/require-student-access";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { CertificateService } from "@/certificates/services/certificate.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * `GET /api/certificates/[certificateId]/pdf` — mirrors `/api/payments/
 * invoices/[invoiceId]/pdf` exactly: authorized as the certificate's
 * owner or an admin/super_admin (`canAccessStudentData`), 404 on any
 * failure (never 403, so existence isn't leaked), PDF rendered on
 * demand from the stored row. `?download=1` flips `Content-Disposition`
 * from `inline` (View) to `attachment` (Download) — same route, one
 * query flag, no separate endpoint needed.
 */
export async function GET(request: Request, context: { params: Promise<{ certificateId: string }> }) {
  const { certificateId } = await context.params;
  const user = await SessionService.getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const certificate = await CertificateService.getById(certificateId).catch(() => null);
  if (!certificate || !canAccessStudentData(user, certificate.userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [profiles, course] = await Promise.all([
    ProfileService.getByUserIds([certificate.userId]),
    CourseRepository.findById(certificate.courseId).catch(() => null),
  ]);
  const profile = profiles[0];

  const pdf = await CertificateService.renderPdf(certificate, {
    studentName: profile?.displayName ?? profile?.fullName ?? profile?.email ?? "Learner",
    courseTitle: course ? resolveLocalizedText(course.title, "en") : "Course",
  });

  const download = new URL(request.url).searchParams.get("download") === "1";

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${certificate.certificateNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
