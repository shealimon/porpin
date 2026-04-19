import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import axios from 'axios'
import { isApiRequestError } from '@/api/axiosError'
import { getJobApiErrorMessage } from '@/api/job'
import { confirmTranslationJob } from '@/features/billing/confirmTranslation'
import {
  fetchMilestoneJob,
  milestoneTranslatedDocxUrl,
  milestoneTranslatedPdfUrl,
  type MilestoneJob,
} from '@/features/jobs/api'
import { readStoredSourceLang } from '@/features/upload/sourceLang'
import { jobStatusLabel } from '@/features/jobs/jobStatus'
import { qk } from '@/lib/queryKeys'
import { queryClient } from '@/lib/queryClient'
import { cn } from '@/lib/utils'
import { useJobStore } from '@/stores/jobStore'
import { formatDurationSeconds } from '@/utils/formatDuration'

const POLL_MS = 2000

/** Job statuses where the translation pipeline is actively running (not payment / estimate). */
const ELAPSED_TIMER_STATUSES = new Set([
  'queued',
  'processing',
  'parsing_document',
  'stitching',
  'generating_file',
])

function normalizeJobStatus(status: string): string {
  return status.toLowerCase().replace(/\s+/g, '_')
}

function shouldRunElapsedTimer(status: string | undefined): boolean {
  if (!status) return false
  return ELAPSED_TIMER_STATUSES.has(normalizeJobStatus(status))
}

type Phase =
  | 'loading'
  | 'starting'
  | 'polling'
  | 'completed'
  | 'failed'
  | 'not_found'

/** Map stored job errors to copy users can act on (OpenAI 429s are common). */
function jobFailureCopy(raw: string | null | undefined): {
  primary: string
  detail?: string
} {
  const generic =
    'Something went wrong while processing your file. Try uploading again.'
  if (!raw?.trim()) {
    return { primary: generic }
  }
  const t = raw.trim()
  const lower = t.toLowerCase()
  if (
    lower.includes('429') ||
    lower.includes('rate limit') ||
    lower.includes('rate_limit') ||
    lower.includes('tokens per min') ||
    lower.includes('tpm')
  ) {
    return {
      primary:
        'The translation service is temporarily busy (AI rate limit). Wait a short time and try again.',
      detail:
        'Large documents or many concurrent jobs can hit your OpenAI tokens-per-minute limit.',
    }
  }
  if (lower.includes('openai') && lower.includes('not configured')) {
    return {
      primary: 'Translation is not fully configured on the server.',
    }
  }
  const sanitized = t.replace(/org-[a-zA-Z0-9]+/gi, 'org-…')
  const short =
    sanitized.length > 220 ? `${sanitized.slice(0, 217).trimEnd()}…` : sanitized
  return { primary: generic, detail: short }
}

export function JobProgressPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const pollErrorToastRef = useRef(false)
  const kickoffAttempted = useRef(false)
  const [kickoffError, setKickoffError] = useState<string | null>(null)
  const [kickoffRetryNonce, setKickoffRetryNonce] = useState(0)
  const [processingStartedAt, setProcessingStartedAt] = useState<number | null>(
    null,
  )
  const [elapsedClockMs, setElapsedClockMs] = useState(() => Date.now())

  const query = useQuery({
    queryKey: qk.jobs.detail(jobId ?? ''),
    enabled: Boolean(jobId),
    queryFn: () => fetchMilestoneJob(jobId!),
    refetchInterval: (q) => {
      const d = q.state.data
      if (!d) return POLL_MS
      if (
        d.status === 'completed' ||
        d.status === 'failed' ||
        d.status === 'preview_ready'
      )
        return false
      return POLL_MS
    },
  })

  const job = query.data

  /** Never show a lower % than we've already shown for this job (covers poll/API glitches). */
  const [peakProgressPercent, setPeakProgressPercent] = useState(0)

  useEffect(() => {
    setPeakProgressPercent(0)
  }, [jobId])

  useEffect(() => {
    if (!job) return
    const st = normalizeJobStatus(job.status)
    if (st === 'failed') {
      setPeakProgressPercent(0)
      return
    }
    if (st === 'completed' || st === 'preview_ready') {
      setPeakProgressPercent(100)
      return
    }
    const raw = job.progressPercent ?? 0
    setPeakProgressPercent((prev) => Math.max(prev, raw))
  }, [job, job?.progressPercent, job?.status])

  const displayJob = useMemo((): MilestoneJob | undefined => {
    if (!job) return undefined
    const st = normalizeJobStatus(job.status)
    if (st === 'failed') return job
    if (st === 'completed' || st === 'preview_ready') {
      return { ...job, progressPercent: 100 }
    }
    const raw = job.progressPercent ?? 0
    return { ...job, progressPercent: Math.max(raw, peakProgressPercent) }
  }, [job, peakProgressPercent])

  const phase: Phase = useMemo(() => {
    if (!jobId) return 'not_found'
    if (query.isPending && !query.data) return 'loading'
    if (query.isError) {
      const err = query.error
      if (isApiRequestError(err) && err.status === 404) return 'not_found'
      return 'polling'
    }
    const st = query.data?.status ?? ''
    if (st === 'estimated' || st === 'preview_ready') return 'starting'
    if (st === 'completed') return 'completed'
    if (st === 'failed') return 'failed'
    return 'polling'
  }, [jobId, query.isPending, query.data, query.isError, query.error])

  const failedCopy = useMemo(() => {
    if (job?.status !== 'failed') return null
    return jobFailureCopy(job?.errorMessage)
  }, [job?.status, job?.errorMessage])

  const errorMessage = useMemo(() => {
    if (!jobId) return 'Missing job ID.'
    if (phase === 'not_found' && query.isError) {
      const err = query.error
      if (isApiRequestError(err) && err.status === 404) {
        return 'We could not find this job. It may have expired.'
      }
    }
    if (query.isError && query.error instanceof Error) {
      return query.error.message
    }
    return null
  }, [jobId, phase, query.isError, query.error])

  useEffect(() => {
    if (!query.isError || !query.error) return
    if (isApiRequestError(query.error) && query.error.status === 404) {
      pollErrorToastRef.current = false
      return
    }
    if (!pollErrorToastRef.current) {
      pollErrorToastRef.current = true
      toast.error(
        query.error instanceof Error ? query.error.message : 'Request failed',
      )
    }
  }, [query.isError, query.error])

  useEffect(() => {
    if (query.isSuccess) pollErrorToastRef.current = false
  }, [query.isSuccess])

  useEffect(() => {
    if (phase === 'completed') {
      void queryClient.invalidateQueries({ queryKey: qk.jobs.all })
    }
  }, [phase])

  useEffect(() => {
    if (!jobId) return
    const j = query.data
    if (!j) return
    const st = j.status
    if (st !== 'estimated' && st !== 'preview_ready') {
      kickoffAttempted.current = false
      setKickoffError(null)
      return
    }
    if (kickoffAttempted.current) return
    kickoffAttempted.current = true
    setKickoffError(null)

    const fileName = useJobStore.getState().history.find((h) => h.id === jobId)?.fileName

    void (async () => {
      try {
        await confirmTranslationJob({
          jobId,
          words: j.totalWords ?? j.wordCount,
          amountToPay: j.amountToPay ?? j.estimatedCost,
          fileName,
          inputLang: readStoredSourceLang(),
        })
        void queryClient.invalidateQueries({ queryKey: qk.jobs.detail(jobId) })
        await query.refetch()
      } catch (e: unknown) {
        kickoffAttempted.current = false
        if (axios.isAxiosError(e) && e.response?.status === 402) {
          setKickoffError(
            typeof (e.response.data as { detail?: unknown })?.detail === 'string'
              ? (e.response.data as { detail: string }).detail
              : 'Not enough pay-as-you-go credit for this job.',
          )
        } else {
          setKickoffError(getJobApiErrorMessage(e))
        }
      }
    })()
  }, [jobId, query.data?.status, kickoffRetryNonce, query])

  useEffect(() => {
    setProcessingStartedAt(null)
  }, [jobId])

  useEffect(() => {
    if (!shouldRunElapsedTimer(job?.status)) return
    setProcessingStartedAt((prev) => prev ?? Date.now())
  }, [job?.status])

  useEffect(() => {
    if (processingStartedAt == null) return
    setElapsedClockMs(Date.now())
  }, [processingStartedAt])

  const isTerminalSuccess = phase === 'completed'
  const isTerminalFail = phase === 'failed' || phase === 'not_found'
  const kickoffBlocked = phase === 'starting' && kickoffError

  const progressPercent = displayJob?.progressPercent ?? 0
  const showLiveElapsed =
    !kickoffBlocked &&
    !isTerminalSuccess &&
    !isTerminalFail &&
    processingStartedAt != null &&
    progressPercent < 100

  useEffect(() => {
    if (!showLiveElapsed) return
    const id = window.setInterval(() => {
      setElapsedClockMs(Date.now())
    }, 1000)
    return () => window.clearInterval(id)
  }, [showLiveElapsed])

  const liveElapsedSeconds =
    showLiveElapsed && processingStartedAt != null
      ? Math.max(0, (elapsedClockMs - processingStartedAt) / 1000)
      : 0

  const { label: progressLabel, fill: progressFill } = resolveProgressUi(
    displayJob,
    phase,
  )

  const docxUrl =
    jobId && phase === 'completed' ? milestoneTranslatedDocxUrl(jobId) : null
  const pdfUrl =
    jobId && phase === 'completed' && job?.outputPdfAvailable
      ? milestoneTranslatedPdfUrl(jobId)
      : null

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div className="processing-flow flex-1 min-h-0 overflow-y-auto overscroll-y-contain">
      <div className="processing-flow__backdrop" aria-hidden />
      <div className="processing-flow__inner w-full max-w-md px-0">
        {kickoffBlocked ? (
          <div className="processing-flow__error-card">
            <h1 className="processing-flow__title">Could not start translation</h1>
            <p className="processing-flow__sub">{kickoffError}</p>
            <button
              type="button"
              onClick={() => {
                setKickoffError(null)
                setKickoffRetryNonce((n) => n + 1)
              }}
              className="mt-4 inline-flex w-full justify-center rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500"
            >
              Try again
            </button>
            <Link
              to="/app/upload"
              className="mt-3 block text-center text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              Back to upload
            </Link>
          </div>
        ) : null}

        {!kickoffBlocked && !isTerminalSuccess && !isTerminalFail && (
          <>
            <h1 className="mb-4 font-display text-xl font-normal tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl">
              Converting your document into natural Hinglish…
            </h1>
            {job && phase !== 'starting' && (
              <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
                {jobStatusLabel(job.status)}
              </p>
            )}
            <p className="processing-flow__percent" aria-live="polite">
              {progressLabel}
            </p>
            <div
              className="processing-flow__bar"
              role="progressbar"
              aria-valuenow={displayJob?.progressPercent ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Translation progress"
            >
              <div
                className="processing-flow__bar-fill"
                style={{ width: `${progressFill}%` }}
              />
            </div>
            {showLiveElapsed ? (
              <p
                className="processing-flow__elapsed mt-3 text-center text-sm tabular-nums text-zinc-600 dark:text-zinc-400"
                aria-live="polite"
              >
                Elapsed: {formatDurationSeconds(liveElapsedSeconds)}
              </p>
            ) : null}
            <p className="processing-flow__hint">
              This may take a few minutes. You can leave this page and return from
              History anytime.
            </p>
          </>
        )}

        {isTerminalSuccess && (
          <div className="processing-flow__done mx-auto flex w-full flex-col gap-4 text-center">
            <div className="w-full">
              <h1 className="font-display text-xl font-normal tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl">
                Your Hinglish version is ready 🎉
              </h1>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Download your translated file below
              </p>
              {job != null && job.translationDurationSeconds != null ? (
                <p className="mt-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Processing time:{' '}
                  {formatDurationSeconds(job.translationDurationSeconds)}
                </p>
              ) : null}
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-3">
              {pdfUrl ? (
                <a
                  href={pdfUrl}
                  download
                  className={cn(
                    'processing-flow__download inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold no-underline transition sm:min-h-0 sm:w-auto sm:min-w-[10rem]',
                    'bg-[#dfff7a] text-zinc-950 shadow-[0_0_20px_-6px_rgba(200,255,0,0.45)]',
                    'hover:brightness-105 active:scale-[0.98]',
                  )}
                >
                  <Download className="size-4 shrink-0" strokeWidth={2.25} aria-hidden />
                  Download PDF
                </a>
              ) : phase === 'completed' ? (
                <p className="text-pretty text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                  {job?.outputPdfHint ??
                    'No PDF for this run — the server could not convert DOCX to PDF. Use DOCX below.'}
                </p>
              ) : null}
              {docxUrl ? (
                <a
                  href={docxUrl}
                  download
                  className={cn(
                    'processing-flow__download inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold no-underline transition sm:min-h-0 sm:w-auto sm:min-w-[10rem]',
                    'border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50',
                    'dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
                    'active:scale-[0.98]',
                  )}
                >
                  <Download className="size-4 shrink-0 opacity-90" strokeWidth={2.25} aria-hidden />
                  Download DOCX
                </a>
              ) : null}
            </div>
            <div className="w-full pt-0.5 sm:flex sm:justify-center">
              <Link
                to="/app/upload"
                className={cn(
                  'processing-flow__download inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold no-underline transition sm:min-h-0 sm:w-auto sm:min-w-[10rem]',
                  'border-zinc-300 bg-zinc-50 text-zinc-800 shadow-sm',
                  'hover:border-zinc-400 hover:bg-zinc-100',
                  'dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-100 dark:hover:bg-zinc-800',
                  'active:scale-[0.98]',
                )}
              >
                <ArrowLeft className="size-4 shrink-0 opacity-80" strokeWidth={2.25} aria-hidden />
                Back to upload
              </Link>
            </div>
          </div>
        )}

        {phase === 'failed' && failedCopy && (
          <div className="processing-flow__error-card">
            <h1 className="processing-flow__title">Translation failed</h1>
            <p className="processing-flow__sub">{failedCopy.primary}</p>
            {failedCopy.detail ? (
              <p className="processing-flow__sub mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {failedCopy.detail}
              </p>
            ) : null}
            {job?.translationDurationSeconds != null ? (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Ran for {formatDurationSeconds(job.translationDurationSeconds)} before
                failure.
              </p>
            ) : null}
            <Link
              to="/app/upload"
              className="mt-4 inline-flex justify-center rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500"
            >
              New upload
            </Link>
          </div>
        )}

        {phase === 'not_found' && (
          <div className="processing-flow__error-card">
            <h1 className="processing-flow__title">Job not found</h1>
            <p className="processing-flow__sub">
              {errorMessage ?? 'This link is missing a job id.'}
            </p>
            <Link
              to="/app/upload"
              className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              Upload a document
            </Link>
          </div>
        )}

        {errorMessage && (phase === 'polling' || phase === 'starting') && (
          <p className="processing-flow__inline-error" role="alert">
            {errorMessage}
          </p>
        )}
      </div>
      </div>
    </div>
  )
}

function resolveProgressUi(
  job: MilestoneJob | undefined,
  phase: Phase,
): { label: string; fill: number } {
  const st = job?.status ?? ''
  const p = job?.progressPercent ?? 0

  if (!job && phase === 'loading') {
    return { label: 'Connecting…', fill: 6 }
  }
  if (phase === 'starting') {
    return { label: 'Processing…', fill: 6 }
  }
  if (st === 'queued') {
    return { label: 'Queued…', fill: Math.max(p, 10) }
  }
  if (st === 'processing') {
    const stage = (job?.currentStage ?? '').toLowerCase()
    const fill =
      stage === 'parsing_document'
        ? Math.max(10, p > 0 ? p : 10)
        : p > 0
          ? p
          : 8
    return { label: `${p}%`, fill }
  }
  if (st === 'stitching') {
    return { label: 'Stitching…', fill: Math.max(p, 20) }
  }
  if (st === 'generating_file' || st === 'generating file') {
    return { label: 'Generating file…', fill: Math.max(p, 85) }
  }
  if (phase === 'loading') {
    return { label: 'Starting…', fill: 6 }
  }
  return { label: `${p}%`, fill: p }
}
