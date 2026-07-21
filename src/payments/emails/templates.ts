/**
 * The Payment Platform's transactional email bodies — deliberately
 * dependency-free inline-styled HTML (email clients ignore external
 * CSS). English copy: transactional receipts are legal/record documents
 * and the invoice itself is English-numbered; the in-app experience
 * stays fully localized through the notifications system.
 */

interface MoneyLine {
  label: string;
  amount: string;
  currency: string;
  emphasize?: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function moneyRows(lines: MoneyLine[]): string {
  return lines
    .map(
      (line) => `
        <tr>
          <td style="padding:6px 0;color:${line.emphasize ? "#111827" : "#6b7280"};font-weight:${line.emphasize ? "600" : "400"};">${escapeHtml(line.label)}</td>
          <td style="padding:6px 0;text-align:right;color:${line.emphasize ? "#111827" : "#374151"};font-weight:${line.emphasize ? "700" : "400"};">${escapeHtml(line.amount)} ${escapeHtml(line.currency)}</td>
        </tr>`,
    )
    .join("");
}

function layout(title: string, intro: string, body: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:32px;">
            <tr><td style="font-size:20px;font-weight:700;color:#111827;padding-bottom:8px;">Bosla</td></tr>
            <tr><td style="font-size:17px;font-weight:600;color:#111827;padding-bottom:12px;">${escapeHtml(title)}</td></tr>
            <tr><td style="font-size:14px;line-height:1.6;color:#374151;padding-bottom:16px;">${intro}</td></tr>
            ${body}
            <tr><td style="font-size:12px;color:#9ca3af;padding-top:24px;border-top:1px solid #e5e7eb;">
              This is a transactional message from Bosla about your purchase. If you didn't expect it, please contact support.
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export interface OrderEmailContext {
  studentName: string;
  courseTitle: string;
  orderId: string;
  currency: string;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  total: string;
  invoiceNumber?: string | null;
}

export function paymentSucceededEmail(context: OrderEmailContext): { subject: string; html: string } {
  const lines: MoneyLine[] = [
    { label: "Subtotal", amount: context.subtotal, currency: context.currency },
    ...(Number(context.discountTotal) > 0
      ? [{ label: "Discount", amount: `-${context.discountTotal}`, currency: context.currency }]
      : []),
    ...(Number(context.taxTotal) > 0
      ? [{ label: "Tax", amount: context.taxTotal, currency: context.currency }]
      : []),
    { label: "Total paid", amount: context.total, currency: context.currency, emphasize: true },
  ];
  const body = `
    <tr><td style="padding-bottom:16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
        ${moneyRows(lines)}
      </table>
    </td></tr>
    <tr><td style="font-size:13px;color:#6b7280;padding-bottom:4px;">Order reference: ${escapeHtml(context.orderId)}</td></tr>
    ${context.invoiceNumber ? `<tr><td style="font-size:13px;color:#6b7280;">Invoice: ${escapeHtml(context.invoiceNumber)} (attached)</td></tr>` : ""}`;
  return {
    subject: `Payment received — you're enrolled in ${context.courseTitle}`,
    html: layout(
      "Payment successful 🎉",
      `Hi ${escapeHtml(context.studentName)},<br/>Your payment for <strong>${escapeHtml(context.courseTitle)}</strong> is confirmed and your enrollment is active. Welcome aboard!`,
      body,
    ),
  };
}

export function paymentFailedEmail(context: { studentName: string; courseTitle: string; orderId: string }): {
  subject: string;
  html: string;
} {
  return {
    subject: `Payment failed for ${context.courseTitle}`,
    html: layout(
      "Payment failed",
      `Hi ${escapeHtml(context.studentName)},<br/>Your payment for <strong>${escapeHtml(context.courseTitle)}</strong> didn't go through. No money left your account for this attempt — you can return to checkout and try again any time.`,
      `<tr><td style="font-size:13px;color:#6b7280;">Order reference: ${escapeHtml(context.orderId)}</td></tr>`,
    ),
  };
}

export function refundIssuedEmail(context: {
  studentName: string;
  courseTitle: string;
  orderId: string;
  amount: string;
  currency: string;
}): { subject: string; html: string } {
  return {
    subject: `Refund issued for ${context.courseTitle}`,
    html: layout(
      "Refund issued",
      `Hi ${escapeHtml(context.studentName)},<br/>We've issued a refund of <strong>${escapeHtml(context.amount)} ${escapeHtml(context.currency)}</strong> for <strong>${escapeHtml(context.courseTitle)}</strong>. Depending on your bank, it can take a few business days to appear on your statement.`,
      `<tr><td style="font-size:13px;color:#6b7280;">Order reference: ${escapeHtml(context.orderId)}</td></tr>`,
    ),
  };
}
