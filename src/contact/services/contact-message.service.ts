import "server-only";

import { ContactMessageRepository } from "@/contact/repositories/contact-message.repository";
import { submitContactMessageSchema } from "@/contact/validators/contact-message.validator";
import { requireContactAccess } from "@/contact/utils/require-contact-access";
import { safeMutation, safeRead } from "@/contact/utils/safe-operation";
import { isSpamLikeContactSubmission } from "@/contact/utils/spam-detection";
import { logger } from "@/lib/logger";
import type {
  ContactMessage,
  ContactMessageSearchFilters,
  ContactMessageSearchResult,
} from "@/contact/types/contact-message";
import type { ContactActionResult } from "@/contact/types/result";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1_000;
const MAX_SUBMISSIONS_PER_WINDOW = 3;

export interface ContactSubmitContext {
  ipAddress: string | null;
  rateLimitedMessage: string;
  spamRejectedMessage: string;
}

function getStringField(input: unknown, field: string): string {
  if (!input || typeof input !== "object") return "";
  const value = (input as Record<string, unknown>)[field];
  return typeof value === "string" ? value : "";
}

function honeypotSuccess(rawInput: unknown): ContactActionResult<ContactMessage> | null {
  if (!getStringField(rawInput, "website").trim()) return null;
  const now = new Date().toISOString();
  return {
    success: true,
    data: {
      id: crypto.randomUUID(),
      name: getStringField(rawInput, "name"),
      email: getStringField(rawInput, "email"),
      subject: getStringField(rawInput, "subject"),
      message: getStringField(rawInput, "message"),
      status: "new",
      createdAt: now,
      resolvedAt: null,
    },
  };
}

/**
 * Orchestration for `contact_messages` (docs/legal-content-platform.md
 * §Contact). `submit` is the ONE unauthenticated write in this domain —
 * anyone can reach the public `/contact` form, signed in or not — every
 * other method is admin-gated via `requireContactAccess`.
 */
export const ContactMessageService = {
  /** The public `/contact` form's entry point. Re-validates
   *  server-side regardless of client validation (defense in depth —
   *  see `submitContactMessageSchema`'s doc comment). */
  async submit(rawInput: unknown, context: ContactSubmitContext): Promise<ContactActionResult<ContactMessage>> {
    return safeMutation(async () => {
      const decoy = honeypotSuccess(rawInput);
      if (decoy) {
        logger.info("[contact] honeypot submission ignored", {
          email: getStringField(rawInput, "email"),
          ipAddress: context.ipAddress,
        });
        return decoy;
      }
      const parsed = submitContactMessageSchema.safeParse(rawInput);
      if (!parsed.success) {
        return {
          success: false,
          code: "validation_failed",
          message: parsed.error.issues.map((issue) => issue.message).join(" "),
        };
      }
      const normalizedEmail = parsed.data.email.toLowerCase();
      const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
      const recent = await ContactMessageRepository.countRecentByIpOrEmail(context.ipAddress, normalizedEmail, since);
      if (recent.ipCount >= MAX_SUBMISSIONS_PER_WINDOW || recent.emailCount >= MAX_SUBMISSIONS_PER_WINDOW) {
        return { success: false, code: "rate_limited", message: context.rateLimitedMessage };
      }

      if (isSpamLikeContactSubmission(parsed.data)) {
        return { success: false, code: "validation_failed", message: context.spamRejectedMessage };
      }

      const created = await ContactMessageRepository.create({
        ...parsed.data,
        email: normalizedEmail,
        ipAddress: context.ipAddress,
      });
      logger.info("[contact] message submitted", { id: created.id, email: created.email });
      return { success: true, data: created };
    });
  },

  async searchResolved(filters: ContactMessageSearchFilters): Promise<ContactMessageSearchResult<ContactMessage>> {
    return safeRead(() => ContactMessageRepository.search(filters), {
      items: [],
      total: 0,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 20,
      totalPages: 1,
    });
  },

  async countByStatus(): Promise<Record<string, number>> {
    return safeRead(() => ContactMessageRepository.countByStatus(), {});
  },

  async getById(id: string): Promise<ContactActionResult<ContactMessage>> {
    const admin = await requireContactAccess();
    if (!admin) {
      return { success: false, code: "forbidden", message: "You cannot view contact messages." };
    }
    const message = await safeRead(() => ContactMessageRepository.findById(id), null);
    if (!message) {
      return { success: false, code: "not_found", message: "Message not found." };
    }
    return { success: true, data: message };
  },

  async markResolved(id: string): Promise<ContactActionResult<ContactMessage>> {
    return safeMutation(async () => {
      const admin = await requireContactAccess();
      if (!admin) {
        return { success: false, code: "forbidden", message: "You cannot manage contact messages." };
      }
      const updated = await ContactMessageRepository.markResolved(id);
      if (!updated) {
        return { success: false, code: "not_found", message: "Message not found." };
      }
      return { success: true, data: updated };
    });
  },

  async remove(id: string): Promise<ContactActionResult> {
    return safeMutation(async () => {
      const admin = await requireContactAccess();
      if (!admin) {
        return { success: false, code: "forbidden", message: "You cannot manage contact messages." };
      }
      const deleted = await ContactMessageRepository.delete(id);
      if (!deleted) {
        return { success: false, code: "not_found", message: "Message not found." };
      }
      return { success: true, data: undefined };
    });
  },
};
