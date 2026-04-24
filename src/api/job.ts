/**
 * Milestone job lifecycle (/job/*). Prefer importing from @/features/jobs/api in new code.
 */
import type { JobDetailDto, JobConfirmResponse, MilestoneJob } from '@/features/jobs/api'
import {
  confirmMilestoneJob,
  confirmMilestoneJobSafe,
  fetchMilestoneJob,
} from '@/features/jobs/api'

export type JobStatusResponse = {
  job_id: string
  status: string
  progress_percent: number
  word_count: number
  estimated_cost: number
}

function toSnake(m: MilestoneJob): JobStatusResponse {
  return {
    job_id: m.jobId,
    status: m.status,
    progress_percent: m.progressPercent,
    word_count: m.wordCount,
    estimated_cost: m.estimatedCost,
  }
}

export async function fetchJobStatus(jobId: string): Promise<JobStatusResponse> {
  const m = await fetchMilestoneJob(jobId)
  return toSnake(m)
}

export async function confirmJobSafe(
  jobId: string,
): Promise<JobConfirmResponse | 'already_started'> {
  return confirmMilestoneJobSafe(jobId)
}

export async function confirmJob(jobId: string): Promise<JobConfirmResponse> {
  return confirmMilestoneJob(jobId)
}

export function getJobApiErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return 'Request failed'
}

export type { JobDetailDto, JobConfirmResponse, MilestoneJob }
