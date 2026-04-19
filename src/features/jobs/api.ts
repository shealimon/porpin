import axios from 'axios'
import { backendClient } from '@/api/backendClient'

export type JobDetailDto = {
  job_id: string
  status: string
  progress_percent: number
  word_count: number
  estimated_cost: number
  error_message?: string | null
  /** Pipeline FSM: uploaded, processing, chunk_translating, stitching, generating_output, … */
  current_stage?: string | null
  batches_done?: number | null
  batches_total?: number | null
  segments_translated?: number | null
  segments_total?: number | null
  output_docx_available?: boolean
  output_pdf_available?: boolean
  /** Why PDF is missing when the job completed (server has no Word/LibreOffice conversion). */
  output_pdf_hint?: string | null
  /** Seconds from processing start to finish (completed or failed), if tracked */
  translation_duration_seconds?: number | null
  total_words?: number | null
  free_used?: number | null
  subscription_used?: number | null
  remaining_words?: number | null
  amount_to_pay?: number | null
  user_plan_type?: string | null
  preview_mode?: boolean
  preview_eligible?: boolean | null
  document_page_count?: number | null
  preview_pages_cap?: number | null
}

export type MilestoneJob = {
  jobId: string
  status: string
  progressPercent: number
  wordCount: number
  estimatedCost: number
  /** Server error detail when status is failed (may be technical). */
  errorMessage?: string | null
  currentStage?: string | null
  batchesDone?: number | null
  batchesTotal?: number | null
  segmentsTranslated?: number | null
  segmentsTotal?: number | null
  outputDocxAvailable: boolean
  outputPdfAvailable: boolean
  outputPdfHint?: string | null
  /** Seconds from processing start to finish, when provided by the API */
  translationDurationSeconds?: number | null
  totalWords?: number | null
  freeUsed?: number | null
  subscriptionUsed?: number | null
  remainingWords?: number | null
  amountToPay?: number | null
  userPlanType?: string | null
  previewMode?: boolean
  previewEligible?: boolean | null
  documentPageCount?: number | null
  previewPagesCap?: number | null
}

export function mapMilestoneJob(d: JobDetailDto): MilestoneJob {
  const raw = d.translation_duration_seconds
  const translationDurationSeconds =
    raw != null && Number.isFinite(raw) ? raw : null
  return {
    jobId: d.job_id,
    status: d.status,
    progressPercent: d.progress_percent,
    wordCount: d.word_count,
    estimatedCost: d.estimated_cost,
    errorMessage: d.error_message ?? null,
    currentStage: d.current_stage ?? null,
    batchesDone: d.batches_done ?? null,
    batchesTotal: d.batches_total ?? null,
    segmentsTranslated: d.segments_translated ?? null,
    segmentsTotal: d.segments_total ?? null,
    outputDocxAvailable: Boolean(d.output_docx_available),
    outputPdfAvailable: Boolean(d.output_pdf_available),
    outputPdfHint: d.output_pdf_hint ?? null,
    translationDurationSeconds,
    totalWords: d.total_words ?? null,
    freeUsed: d.free_used ?? null,
    subscriptionUsed: d.subscription_used ?? null,
    remainingWords: d.remaining_words ?? null,
    amountToPay: d.amount_to_pay ?? null,
    userPlanType: d.user_plan_type ?? null,
    previewMode: Boolean(d.preview_mode),
    previewEligible: d.preview_eligible ?? null,
    documentPageCount: d.document_page_count ?? null,
    previewPagesCap: d.preview_pages_cap ?? null,
  }
}

/** Matches backend ``translation_download_url_prefix`` default: ``/api/translation-outputs``. */
function translationOutputsBaseUrl(): string {
  const origin = import.meta.env.VITE_BACKEND_ORIGIN?.replace(/\/$/, '') ?? ''
  const path = '/api/translation-outputs'
  return origin ? `${origin}${path}` : path
}

export function milestoneTranslatedDocxUrl(jobId: string): string {
  return `${translationOutputsBaseUrl()}/${encodeURIComponent(jobId)}/translated.docx`
}

export function milestoneTranslatedPdfUrl(jobId: string): string {
  return `${translationOutputsBaseUrl()}/${encodeURIComponent(jobId)}/translated.pdf`
}

export async function fetchMilestoneJob(jobId: string): Promise<MilestoneJob> {
  const { data } = await backendClient.get<JobDetailDto>(
    `/job/${encodeURIComponent(jobId)}`,
  )
  return mapMilestoneJob(data)
}

export type MilestoneInputLang = 'en' | 'hi'

export async function confirmMilestoneJob(
  jobId: string,
  inputLang: MilestoneInputLang = 'en',
): Promise<void> {
  await backendClient.post('/job/confirm', {
    job_id: jobId,
    input_lang: inputLang,
  })
}

export async function startMilestonePreviewJob(
  jobId: string,
  inputLang: MilestoneInputLang = 'en',
): Promise<void> {
  await backendClient.post('/job/preview-start', {
    job_id: jobId,
    input_lang: inputLang,
  })
}

/**
 * Idempotent confirm: 409 (already queued / wrong state) returns false.
 * Use the boolean to avoid duplicate client-side billing rows when confirm already ran.
 */
export async function confirmMilestoneJobSafe(
  jobId: string,
  inputLang: MilestoneInputLang = 'en',
): Promise<boolean> {
  try {
    await confirmMilestoneJob(jobId, inputLang)
    return true
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 409) return false
    throw e
  }
}
