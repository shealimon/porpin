export type JobStatus =
  | 'draft'
  | 'pending_estimate'
  | 'estimated'
  | 'queued'
  | 'processing'
  | 'stitching'
  | 'generating_file'
  | 'completed'
  | 'failed'

export interface Job {
  id: string
  status: JobStatus
  fileName: string
  fileSizeBytes: number
  createdAt: string
  updatedAt: string
  progressPercent: number
  errorMessage?: string
}

export interface JobEstimate {
  jobId: string
  wordCount: number
  amountCents: number
  currency: string
}

export interface JobListItem {
  id: string
  fileName: string
  status: JobStatus
  createdAt: string
  /** Output mode captured at upload time (used when starting the job). */
  translationTarget?: 'hinglish' | 'hindi'
  /** Present when the job row has ``completed_at`` (e.g. History from DB). */
  completedAt?: string
  amountCents?: number
  currency?: string
}
