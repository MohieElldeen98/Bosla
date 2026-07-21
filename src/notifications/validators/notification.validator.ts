import { z } from "zod";
import { NOTIFICATION_SORT_DIRECTIONS, NOTIFICATION_SORT_FIELDS } from "@/notifications/types/notification-search";

/** Parses `listNotificationsAction`'s filters — the bell dropdown calls
 *  this with `{ unreadOnly: true, pageSize: 5 }`-style plain objects, the
 *  full `/notifications` page with URL search params (coerced the same
 *  way `searchCouponsSchema`/`searchMediaSchema` already coerce
 *  string-typed URL params). */
export const searchNotificationsSchema = z.object({
  unreadOnly: z.coerce.boolean().optional(),
  sortBy: z.enum(NOTIFICATION_SORT_FIELDS).optional(),
  sortDirection: z.enum(NOTIFICATION_SORT_DIRECTIONS).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
export type SearchNotificationsInput = z.infer<typeof searchNotificationsSchema>;

/** `/me/settings`'s notification-preferences toggles — all three
 *  required together, the form always saves the full set. */
export const updateNotificationPreferencesSchema = z.object({
  learningUpdates: z.boolean(),
  ordersAndPayments: z.boolean(),
  courseAndInstructorUpdates: z.boolean(),
});
