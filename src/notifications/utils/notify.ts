import { logger } from "@/lib/logger";
import { NotificationService } from "@/notifications/services/notification.service";
import type { NewNotificationInput } from "@/notifications/types/notification";

/**
 * Best-effort, fire-and-forget notification creation for other domains'
 * Services to call after their own business mutation has already
 * succeeded — mirrors every domain's own `record*AuditLog` helper
 * exactly (`courses/utils/audit-log.ts`, `instructor/utils/audit-log.ts`,
 * etc.): a notification failure must never turn a successful save into a
 * reported error, so it's swallowed and logged here, not propagated.
 *
 * Callers `await` this (so the notification row exists by the time the
 * request returns) but never branch on its result — there is nothing a
 * caller could do differently if it fails, same reasoning audit logging
 * already established.
 */
export async function notify(input: NewNotificationInput): Promise<void> {
  try {
    const result = await NotificationService.create(input);
    if (!result.success) {
      logger.error("[notifications:create]", result.message);
    }
  } catch (error) {
    logger.error("[notifications:create]", error);
  }
}

/** Fan-out to many recipients (e.g. "notify all Admins") — one row per
 *  recipient, each independently best-effort so one failed insert never
 *  stops the rest from being created. */
export async function notifyMany(inputs: NewNotificationInput[]): Promise<void> {
  await Promise.all(inputs.map((input) => notify(input)));
}
