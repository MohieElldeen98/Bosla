"use server";

import { JobService } from "@/jobs/service";
import type { JobActionResult, JobListItem, JobStatus } from "@/jobs/types";

export async function searchJobsAction(status?: JobStatus): Promise<JobListItem[]> {
  return JobService.search(status);
}

export async function getJobCountsAction(): Promise<Partial<Record<JobStatus, number>>> {
  return JobService.getCounts();
}

export async function retryJobAction(id: string): Promise<JobActionResult> {
  return JobService.retry(id);
}

export async function deleteJobAction(id: string): Promise<JobActionResult> {
  return JobService.delete(id);
}
