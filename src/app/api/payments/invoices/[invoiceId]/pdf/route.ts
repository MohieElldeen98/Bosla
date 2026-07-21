import { NextResponse } from "next/server";
import { SessionService } from "@/auth/services/session.service";
import { OrderRepository } from "@/commerce/repositories/order.repository";
import { OrderItemRepository } from "@/commerce/repositories/order-item.repository";
import { CourseRepository } from "@/courses/repositories/course.repository";
import { ProfileService } from "@/auth/services/profile.service";
import { canAccessStudentData } from "@/commerce/utils/require-student-access";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { InvoiceService } from "@/payments/services/invoice.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * `GET /api/payments/invoices/[invoiceId]/pdf` — the downloadable
 * receipt. Authorized exactly like any other student-owned commerce
 * read: the order's owner, or a role `canAccessStudentData` admits
 * (admin/super-admin). The PDF is rendered on demand from the stored
 * invoice row (`InvoiceService.renderPdf`) — nothing is persisted.
 */
export async function GET(_request: Request, context: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await context.params;
  const user = await SessionService.getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoice = await InvoiceService.getById(invoiceId).catch(() => null);
  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const order = await OrderRepository.findById(invoice.orderId).catch(() => null);
  if (!order || !canAccessStudentData(user, order.studentId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [items, profiles] = await Promise.all([
    OrderItemRepository.findByOrderId(order.id).catch(() => []),
    ProfileService.getByUserIds([order.studentId]),
  ]);
  const courses = await CourseRepository.findByIds(items.map((item) => item.courseId)).catch(() => []);
  const profile = profiles[0];

  const pdf = await InvoiceService.renderPdf(invoice, {
    studentName: profile?.displayName ?? profile?.fullName ?? profile?.email ?? "Student",
    studentEmail: profile?.email ?? "",
    courseTitle: courses[0] ? resolveLocalizedText(courses[0].title, "en") : "Course",
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
