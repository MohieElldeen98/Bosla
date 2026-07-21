"use server";

import { WorkspaceOverviewService } from "@/learning/services/workspace-overview.service";
import { SessionService } from "@/auth/services/session.service";
import type { Locale } from "@/i18n/routing";
import type { WorkspaceOverviewData } from "@/learning/types/workspace-overview";
import type { LearningActionResult } from "@/learning/types/result";

/** `/me`'s Overview tab — always the caller's own workspace, same
 *  "no route param for whose dashboard" reasoning `getMyDashboardAction`
 *  already established. */
export async function getMyWorkspaceOverviewAction(
  locale: Locale,
): Promise<LearningActionResult<WorkspaceOverviewData>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  return WorkspaceOverviewService.getOverview(actingUser, actingUser.id, locale);
}
