import "server-only";

import { JobRepository } from "@/jobs/repository";
import { requireJobsAccess } from "@/jobs/utils/require-jobs-access";
import { safeMutation, safeRead } from "@/jobs/utils/safe-operation";
import type { JobActionResult, JobListItem, JobStatus } from "@/jobs/types";

/** `/admin/jobs`'s own service — reads are unrestricted at this layer
 *  (the page itself is Super-Admin-gated via `requireRole`, same
 *  convention `requireCmsAccess`'s doc comment explains for CMS reads);
 *  mutations (`retry`/`delete`) call `requireJobsAccess` themselves so a
 *  direct Server Action call can't bypass the page's own guard. */
export const JobService = {
  async search(status?: JobStatus): Promise<JobListItem[]> {
    return safeRead(() => JobRepository.search(status), []);
  },

  async getCounts(): Promise<Partial<Record<JobStatus, number>>> {
    return safeRead(() => JobRepository.countByStatus(), {});
  },

  async retry(id: string): Promise<JobActionResult> {
    return safeMutation(async () => {
      const user = await requireJobsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage the job queue." };
      }
      const retried = await JobRepository.retry(id);
      if (!retried) {
        return { success: false, code: "not_found", message: "This job is no longer failed — nothing to retry." };
      }
      return { success: true, data: undefined };
    });
  },

  async delete(id: string): Promise<JobActionResult> {
    return safeMutation(async () => {
      const user = await requireJobsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot manage the job queue." };
      }
      const removed = await JobRepository.remove(id);
      if (!removed) {
        return { success: false, code: "not_found", message: "This job is no longer failed — nothing to delete." };
      }
      return { success: true, data: undefined };
    });
  },
};
