"use server";

import { SessionService } from "@/auth/services/session.service";
import { CertificateService } from "@/certificates/services/certificate.service";
import type { Certificate } from "@/certificates/types/certificate";
import type { CertificateActionResult } from "@/certificates/types/result";

export async function listMyCertificatesAction(): Promise<CertificateActionResult<Certificate[]>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  return CertificateService.listForStudent(actingUser, actingUser.id);
}
