import type { Job, JobEstimate, JobListItem, JobStatus } from '../types/job'
import { apiClient } from './client'
import { DEFAULT_TABLE_PAGE_SIZE } from '@/lib/tablePagination'

export async function createJobFromFile(file: File): Promise<{ id: string }> {
  const body = new FormData()
  body.append('file', file)
  const { data } = await apiClient.post<{ id: string }>('/jobs', body)
  return data
}

export async function fetchJobEstimate(jobId: string): Promise<JobEstimate> {
  const { data } = await apiClient.post<JobEstimate>(
    `/jobs/${jobId}/estimate`,
  )
  return data
}

export async function startJob(jobId: string): Promise<{ status: JobStatus }> {
  const { data } = await apiClient.post<{ status: JobStatus }>(
    `/jobs/${jobId}/start`,
  )
  return data
}

export async function fetchJob(jobId: string): Promise<Job> {
  const { data } = await apiClient.get<Job>(`/jobs/${jobId}`)
  return data
}

export async function listJobs(): Promise<JobListItem[]> {
  const { data } = await apiClient.get<JobListItem[]>('/jobs', { timeout: 45_000 })
  return data
}

const HISTORY_PAGE_SIZE = DEFAULT_TABLE_PAGE_SIZE

export type CompletedJobsPageResponse = {
  items: JobListItem[]
  total: number
  page: number
  pageSize: number
}

export async function listCompletedJobsPage(
  page: number,
  pageSize: number = HISTORY_PAGE_SIZE,
): Promise<CompletedJobsPageResponse> {
  const { data: raw } = await apiClient.get<unknown>('/jobs', {
    params: {
      completed_only: true,
      page,
      page_size: pageSize,
    },
    timeout: 45_000,
  })
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { items: [], total: 0, page, pageSize }
  }
  const o = raw as Record<string, unknown>
  const items = Array.isArray(o.items) ? (o.items as JobListItem[]) : []
  const total = typeof o.total === 'number' ? o.total : Number(o.total) || 0
  const pageRet = typeof o.page === 'number' ? o.page : page
  const ps =
    typeof o.pageSize === 'number'
      ? o.pageSize
      : typeof o.page_size === 'number'
        ? o.page_size
        : pageSize
  return { items, total, page: pageRet, pageSize: ps }
}

export { HISTORY_PAGE_SIZE }

export function getJobDownloadUrl(jobId: string): string {
  const base = apiClient.defaults.baseURL ?? ''
  return `${base}/jobs/${jobId}/download`
}
