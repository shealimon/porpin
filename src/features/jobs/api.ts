import axios from 'axios'

/** Response from `POST /job/confirm` (breakdown may include billing fields from backend). */
export type JobConfirmResponse = {
  ok: boolean
  awaiting_payment?: boolean
  amount_to_pay?: number
  [key: string]: unknown
}
import { backendClient } from '@/api/backendClient'
import { normalizeAxiosError } from '@/api/axiosError'
import { downloadBlob } from '@/features/translate/syncApi'

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
  translation_target?: string | null
  translation_target_label?: string | null
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
  translationTarget?: string | null
  translationTargetLabel?: string | null
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
    translationTarget: d.translation_target ?? null,
    translationTargetLabel: d.translation_target_label ?? null,
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

function parseContentDispositionFilename(header: string | undefined): string | null {
  if (!header) return null
  const utf8 = /filename\*=(?:UTF-8''|utf-8'')([^;]+)/i.exec(header)
  if (utf8) {
    const raw = utf8[1].trim().replace(/^"|"$/g, '')
    try {
      return decodeURIComponent(raw)
    } catch {
      return raw
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(header)
  if (quoted) return quoted[1]
  const plain = /filename=([^;\s]+)/i.exec(header)
  if (plain) return plain[1].replace(/^"|"$/g, '')
  return null
}

async function detailFromErrorBlob(blob: Blob): Promise<string | null> {
  try {
    const t = await blob.text()
    const j = JSON.parse(t) as { detail?: unknown }
    if (typeof j.detail === 'string') return j.detail
    if (Array.isArray(j.detail)) return JSON.stringify(j.detail)
  } catch {
    /* ignore */
  }
  return null
}

/**
 * Download translated DOCX/PDF with the same auth as other API calls.
 * Plain {@link HTMLAnchorElement} navigation does not send `Authorization`, so the API
 * returned 401 JSON — browsers often saved that body as `translated.json`.
 */
export async function downloadMilestoneTranslatedArtifact(
  jobId: string,
  kind: 'docx' | 'pdf',
): Promise<void> {
  const url =
    kind === 'pdf'
      ? milestoneTranslatedPdfUrl(jobId)
      : milestoneTranslatedDocxUrl(jobId)
  try {
    const res = await backendClient.get(url, {
      responseType: 'blob',
      headers: { Accept: '*/*' },
    })
    const ct = (res.headers['content-type'] ?? '').toLowerCase()
    if (ct.includes('application/json')) {
      const detail = await detailFromErrorBlob(res.data as Blob)
      throw new Error(detail ?? 'Download failed')
    }
    const disposition = res.headers['content-disposition'] as string | undefined
    const name =
      parseContentDispositionFilename(disposition) ??
      (kind === 'pdf' ? 'translated.pdf' : 'translated.docx')
    downloadBlob(res.data, name)
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
      const detail = await detailFromErrorBlob(err.response.data)
      throw new Error(detail ?? 'Download failed')
    }
    throw normalizeAxiosError(err)
  }
}

export async function fetchMilestoneJob(jobId: string): Promise<MilestoneJob> {
  const { data } = await backendClient.get<JobDetailDto>(
    `/job/${encodeURIComponent(jobId)}`,
  )
  return mapMilestoneJob(data)
}

export type MilestoneTranslationTarget = 'hinglish' | 'hindi'

export async function confirmMilestoneJob(
  jobId: string,
  translationTarget: MilestoneTranslationTarget = 'hinglish',
): Promise<JobConfirmResponse> {
  const { data } = await backendClient.post<JobConfirmResponse>('/job/confirm', {
    job_id: jobId,
    input_lang: 'en',
    translation_target: translationTarget,
  })
  return data
}

export async function startMilestonePreviewJob(
  jobId: string,
  translationTarget: MilestoneTranslationTarget = 'hinglish',
): Promise<void> {
  await backendClient.post('/job/preview-start', {
    job_id: jobId,
    input_lang: 'en',
    translation_target: translationTarget,
  })
}

/**
 * Idempotent confirm: 409 (already queued / wrong state) returns ``already_started``.
 */
export async function confirmMilestoneJobSafe(
  jobId: string,
  translationTarget: MilestoneTranslationTarget = 'hinglish',
): Promise<JobConfirmResponse | 'already_started'> {
  try {
    return await confirmMilestoneJob(jobId, translationTarget)
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 409) return 'already_started'
    throw e
  }
}
