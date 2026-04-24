import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download, Loader2, Wallet } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import axios from 'axios'
import { isApiRequestError } from '@/api/axiosError'
import { getJobApiErrorMessage } from '@/api/job'
import { confirmTranslationJob } from '@/features/billing/confirmTranslation'
import { runPaygJobRazorpayCheckout } from '@/features/billing/runPaygJobRazorpay'
import {
  downloadMilestoneTranslatedArtifact,
  fetchMilestoneJob,
  type MilestoneJob,
} from '@/features/jobs/api'
import { readStoredSourceLang } from '@/features/upload/sourceLang'
import { jobStatusLabel } from '@/features/jobs/jobStatus'
import { qk } from '@/lib/queryKeys'
import { queryClient } from '@/lib/queryClient'
import { refreshProfileExtras } from '@/lib/syncBackendProfile'
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

function normalizeJobStatus(status: string | undefined | null): string {
  if (status == null || String(status).trim() === '') return ''
  return String(status).trim().toLowerCase().replace(/\s+/g, '_')
}

function shouldRunElapsedTimer(status: string | undefined): boolean {
  if (!status) return false
  return ELAPSED_TIMER_STATUSES.has(normalizeJobStatus(status))
}

type Phase =
  | 'loading'
  | 'starting'
  | 'awaiting_payment'
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
  /** If POST /job/confirm returns OK but the next read still says estimated, bump this to re-run the effect. */
  const [kickoffRetryNonce, setKickoffRetryNonce] = useState(0)
  const preConfirmRefetchTries = useRef(0)
  const [kickoffInFlight, setKickoffInFlight] = useState(false)
  const [kickoffError, setKickoffError] = useState<string | null>(null)
  const [processingStartedAt, setProcessingStartedAt] = useState<number | null>(
    null,
  )
  const [elapsedClockMs, setElapsedClockMs] = useState(() => Date.now())
  const [downloadBusy, setDownloadBusy] = useState<'pdf' | 'docx' | null>(null)
  const [payBusy, setPayBusy] = useState(false)
  /** Set true when Razorpay closed / failed so we can show retry (not on first paint). */
  const [paygDismissed, setPaygDismissed] = useState(false)
  /** One automatic Razorpay open per (job, awaiting_payment) so closing the modal does not loop forever. */
  const autoPaygLaunchKey = useRef<string | null>(null)

  const query = useQuery({
    queryKey: qk.jobs.detail(jobId ?? ''),
    enabled: Boolean(jobId),
    queryFn: () => fetchMilestoneJob(jobId!),
    refetchInterval: (q) => {
      const d = q.state.data
      if (!d) return POLL_MS
      // Do not stop for preview_ready: if the post-confirm refetch is missed, the query
      // would otherwise never poll again and the page stays on "Processing…" indefinitely.
      const s = normalizeJobStatus(d.status)
      if (s === 'completed' || s === 'failed') return false
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
    preConfirmRefetchTries.current = 0
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

  const isPreConfirm = useMemo(() => {
    const n = normalizeJobStatus(job?.status)
    return n === 'estimated' || n === 'preview_ready'
  }, [job?.status])

  const phase: Phase = useMemo(() => {
    if (!jobId) return 'not_found'
    if (query.isPending && !query.data) return 'loading'
    if (query.isError) {
      const err = query.error
      if (isApiRequestError(err) && err.status === 404) return 'not_found'
      return 'polling'
    }
    const n = normalizeJobStatus(query.data?.status)
    if (n === 'awaiting_payment') return 'awaiting_payment'
    if (n === 'estimated' || n === 'preview_ready') return 'starting'
    if (n === 'completed') return 'completed'
    if (n === 'failed') return 'failed'
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
    if (phase !== 'awaiting_payment') setPaygDismissed(false)
  }, [phase])

  useEffect(() => {
    if (!jobId) return
    const j = job
    if (!j) return
    // Must use the same normalized status as `phase` — raw API strings (spacing/casing)
    // that are not exactly `estimated` / `preview_ready` would otherwise skip /job/confirm
    // while the page still shows the "starting" / Converting + Processing state.
    const n = normalizeJobStatus(j.status)
    if (n !== 'estimated' && n !== 'preview_ready') {
      kickoffAttempted.current = false
      setKickoffInFlight(false)
      preConfirmRefetchTries.current = 0
      setKickoffError(null)
      return
    }
    if (kickoffAttempted.current) return
    kickoffAttempted.current = true
    setKickoffError(null)
    setKickoffInFlight(true)

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
        await queryClient.refetchQueries({ queryKey: qk.jobs.detail(jobId) })
        const after = queryClient.getQueryData(
          qk.jobs.detail(jobId),
        ) as MilestoneJob | undefined
        const sAfter = normalizeJobStatus(after?.status)
        // If the server still looks pre-confirm, React Query can keep a stale `status` string
        // in deps so the effect would not re-run; bump the nonce a few times to call confirm again
        // or let the user use "Start translation".
        if (sAfter === 'estimated' || sAfter === 'preview_ready') {
          kickoffAttempted.current = false
          if (preConfirmRefetchTries.current < 4) {
            preConfirmRefetchTries.current += 1
            setKickoffRetryNonce((x) => x + 1)
          } else {
            setKickoffError(
              'The job is still in "estimated" after starting. Check that the API (port 8000) is running, then click Start translation below or refresh the page.',
            )
          }
        }
      } catch (e: unknown) {
        if (axios.isAxiosError(e) && e.response?.status === 402) {
          // Keep kickoffAttempted true so the effect does not re-fire every poll and spam /job/confirm
          // (the job stays "estimated" while the error is shown).
          setKickoffError(
            typeof (e.response.data as { detail?: unknown })?.detail === 'string'
              ? (e.response.data as { detail: string }).detail
              : 'Not enough pay-as-you-go credit for this job.',
          )
        } else {
          kickoffAttempted.current = false
          setKickoffError(getJobApiErrorMessage(e))
        }
      } finally {
        setKickoffInFlight(false)
      }
    })()
  }, [jobId, job?.status, kickoffRetryNonce])

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
    phase !== 'awaiting_payment' &&
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

  const canDownloadDocx = Boolean(jobId && phase === 'completed')
  const canDownloadPdf = Boolean(
    jobId && phase === 'completed' && job?.outputPdfAvailable,
  )

  const onDownloadPdf = async () => {
    if (!jobId) return
    setDownloadBusy('pdf')
    try {
      await downloadMilestoneTranslatedArtifact(jobId, 'pdf')
    } catch (e) {
      toast.error(getJobApiErrorMessage(e))
    } finally {
      setDownloadBusy(null)
    }
  }

  const onDownloadDocx = async () => {
    if (!jobId) return
    setDownloadBusy('docx')
    try {
      await downloadMilestoneTranslatedArtifact(jobId, 'docx')
    } catch (e) {
      toast.error(getJobApiErrorMessage(e))
    } finally {
      setDownloadBusy(null)
    }
  }

  const onPayForJob = useCallback(async () => {
    if (!jobId || !job) return
    const fileName = useJobStore.getState().history.find((h) => h.id === jobId)
      ?.fileName
    setPaygDismissed(false)
    setPayBusy(true)
    try {
      const ok = await runPaygJobRazorpayCheckout({
        jobId,
        fileName,
        description: `Pay for translation${fileName ? ` · ${fileName}` : ''}`,
      })
      if (!ok) {
        setPaygDismissed(true)
        return
      }
      setPaygDismissed(false)
      void queryClient.invalidateQueries({ queryKey: qk.jobs.all })
      void queryClient.invalidateQueries({ queryKey: qk.jobs.detail(jobId) })
      void refreshProfileExtras()
      await query.refetch()
    } finally {
      setPayBusy(false)
    }
  }, [jobId, job, query])

  useEffect(() => {
    if (phase !== 'awaiting_payment' || !jobId || !job) {
      if (phase !== 'awaiting_payment') autoPaygLaunchKey.current = null
      return
    }
    const key = `${jobId}:awaiting`
    if (autoPaygLaunchKey.current === key) return
    autoPaygLaunchKey.current = key
    void onPayForJob()
  }, [phase, jobId, job, onPayForJob])

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div className="processing-flow flex-1 min-h-0 overflow-y-auto overscroll-y-contain">
      <div className="processing-flow__backdrop" aria-hidden />
      <div className="processing-flow__inner w-full min-w-0 max-w-lg px-3 sm:px-4">
        {kickoffBlocked ? (
          <div className="processing-flow__error-card">
            <h1 className="processing-flow__title">Could not start translation</h1>
            <p className="processing-flow__sub">{kickoffError}</p>
            <button
              type="button"
              onClick={() => {
                setKickoffError(null)
                kickoffAttempted.current = false
                preConfirmRefetchTries.current = 0
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
              Back To Upload
            </Link>
          </div>
        ) : null}

        {!kickoffBlocked && phase === 'awaiting_payment' && jobId && job ? (
          <div className="w-full min-w-0 max-w-lg">
            {payBusy || !paygDismissed ? (
              <p className="flex items-center justify-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                {payBusy ? 'Opening payment…' : 'Preparing…'}
              </p>
            ) : (
              <div
                className="box-border w-full min-w-0 max-w-full overflow-x-clip rounded-2xl border border-amber-200/90 bg-gradient-to-b from-amber-50/95 via-white to-white shadow-[0_8px_30px_-12px_rgba(234,88,12,0.2)] dark:border-amber-900/50 dark:from-amber-950/40 dark:via-zinc-900/80 dark:to-zinc-900/90 dark:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.45)]"
                role="region"
                aria-label="Payment incomplete"
              >
                <div className="overflow-hidden rounded-t-2xl border-b border-amber-100/90 px-6 pb-5 pt-6 text-center dark:border-amber-900/40 sm:px-8 sm:pb-6 sm:pt-7">
                  <div
                    className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-50/95 text-brand-700 ring-1 ring-brand-200/85 shadow-sm dark:bg-brand-950/50 dark:text-brand-300 dark:ring-brand-800/55 sm:size-14"
                    aria-hidden
                  >
                    <Wallet className="size-6 sm:size-7" strokeWidth={1.8} />
                  </div>
                  <h2 className="font-display text-lg font-semibold leading-snug tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-xl">
                    Payment was not completed
                  </h2>
                  <p className="mx-auto mt-3 max-w-[30rem] text-pretty text-sm leading-relaxed text-zinc-600 sm:text-[0.9375rem] dark:text-zinc-400">
                    The payment window was closed before checkout finished. Try again to
                    continue, or return to the upload page to pick a different file.
                  </p>
                </div>
                <div className="flex w-full min-w-0 max-w-full flex-col items-center gap-3 rounded-b-2xl p-4 sm:p-5">
                  <div className="flex w-full max-w-xs flex-col gap-3 sm:max-w-sm">
                  <button
                    type="button"
                    onClick={() => {
                      if (!jobId) return
                      autoPaygLaunchKey.current = null
                      void onPayForJob()
                    }}
                    className={cn(
                      'box-border flex h-10 w-full min-w-0 items-center justify-center gap-2 rounded-lg border-0 px-5',
                      'bg-emerald-600 text-sm font-semibold text-white shadow-md shadow-black/10',
                      'transition hover:bg-emerald-700 hover:shadow-lg hover:shadow-black/15 active:scale-[0.98]',
                      'dark:bg-emerald-500 dark:hover:bg-emerald-400',
                      'outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-0 dark:focus-visible:ring-zinc-500/50',
                    )}
                  >
                    Try Payment Again
                  </button>
                  <Link
                    to="/app/upload"
                    className={cn(
                      'box-border flex h-10 w-full min-w-0 max-w-full items-center justify-center gap-2 rounded-lg border border-brand-200/90 bg-brand-50/90 px-5',
                      'text-sm font-semibold text-brand-900 no-underline shadow-sm',
                      'transition hover:border-brand-300 hover:bg-brand-100/90 active:scale-[0.98]',
                      'dark:border-brand-700/55 dark:bg-brand-950/45 dark:text-brand-100 dark:hover:border-brand-600/70 dark:hover:bg-brand-900/55',
                      'outline-none focus-visible:ring-2 focus-visible:ring-brand-400/45 focus-visible:ring-offset-0 dark:focus-visible:ring-brand-500/45',
                    )}
                  >
                    <ArrowLeft
                      className="size-4 shrink-0 text-brand-700 opacity-90 dark:text-brand-300"
                      strokeWidth={2.25}
                      aria-hidden
                    />
                    Back To Upload
                  </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {!kickoffBlocked && !isTerminalSuccess && !isTerminalFail && phase !== 'awaiting_payment' && (
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
                className="processing-flow__elapsed mt-4 text-center text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-50 sm:text-xl"
                aria-live="polite"
              >
                Time: {formatDurationSeconds(liveElapsedSeconds)}
              </p>
            ) : null}
            <p className="processing-flow__hint">
              This may take a few minutes. You can leave this page and return from
              History anytime.
            </p>
            {isPreConfirm && !kickoffInFlight && (
              <p className="mt-3 text-pretty text-sm text-zinc-600 dark:text-zinc-400">
                If nothing changes after a few seconds, the start request may not have been
                sent.{' '}
                <button
                  type="button"
                  onClick={() => {
                    if (!jobId) return
                    setKickoffError(null)
                    preConfirmRefetchTries.current = 0
                    kickoffAttempted.current = false
                    setKickoffRetryNonce((n) => n + 1)
                  }}
                  className="font-semibold text-brand-600 underline decoration-brand-600/30 underline-offset-2 hover:decoration-brand-600/80 dark:text-brand-400"
                >
                  Start translation
                </button>
              </p>
            )}
            {isPreConfirm && kickoffInFlight && (
              <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-500">
                Sending start request to the server…
              </p>
            )}
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
              {canDownloadPdf ? (
                <button
                  type="button"
                  onClick={onDownloadPdf}
                  disabled={downloadBusy !== null}
                  className={cn(
                    'processing-flow__download font-display inline-flex min-h-[44px] w-full shrink-0 cursor-pointer appearance-none items-center justify-center gap-2 rounded-xl border-0 px-4 py-3 text-sm font-normal tracking-tight transition sm:min-h-0 sm:w-auto sm:min-w-[10rem]',
                    'bg-[var(--text-h)] text-white shadow-md shadow-black/20',
                    'hover:bg-black dark:hover:bg-zinc-900',
                    'dark:bg-zinc-950 dark:text-white dark:shadow-black/40',
                    'active:scale-[0.98]',
                    'disabled:pointer-events-none disabled:opacity-60',
                  )}
                >
                  <Download className="size-4 shrink-0" strokeWidth={2.25} aria-hidden />
                  Download PDF
                </button>
              ) : phase === 'completed' ? (
                <p className="text-pretty text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                  {job?.outputPdfHint ??
                    'No PDF for this run — the server could not convert DOCX to PDF. Use DOCX below.'}
                </p>
              ) : null}
              {canDownloadDocx ? (
                <button
                  type="button"
                  onClick={onDownloadDocx}
                  disabled={downloadBusy !== null}
                  className={cn(
                    'processing-flow__download font-display inline-flex min-h-[44px] w-full shrink-0 cursor-pointer appearance-none items-center justify-center gap-2 rounded-xl border-0 px-4 py-3 text-sm font-normal tracking-tight transition sm:min-h-0 sm:w-auto sm:min-w-[10rem]',
                    'bg-white text-zinc-900 hover:bg-zinc-50',
                    'dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
                    'active:scale-[0.98]',
                    'disabled:pointer-events-none disabled:opacity-60',
                  )}
                >
                  <Download className="size-4 shrink-0 opacity-90" strokeWidth={2.25} aria-hidden />
                  Download DOCX
                </button>
              ) : null}
            </div>
            <div className="w-full pt-0.5 sm:flex sm:justify-center">
              <Link
                to="/app/upload"
                className={cn(
                  'processing-flow__download inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold no-underline transition sm:min-h-0 sm:w-auto sm:min-w-[10rem]',
                  'border-brand-200/90 bg-brand-50/90 text-brand-900 shadow-sm',
                  'hover:border-brand-300 hover:bg-brand-100/90',
                  'dark:border-brand-700/55 dark:bg-brand-950/45 dark:text-brand-100 dark:hover:border-brand-600/70 dark:hover:bg-brand-900/55',
                  'active:scale-[0.98]',
                )}
              >
                <ArrowLeft
                  className="size-4 shrink-0 text-brand-700 opacity-90 dark:text-brand-300"
                  strokeWidth={2.25}
                  aria-hidden
                />
                Back To Upload
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
  if (phase === 'awaiting_payment') {
    return { label: 'Payment required', fill: 0 }
  }
  if (phase === 'starting') {
    return { label: 'Processing…', fill: 6 }
  }
  if (st === 'queued') {
    return { label: 'Queued…', fill: Math.max(p, 10) }
  }
  if (st === 'processing') {
    // When progress is still 0, avoid alternating bar width (8% vs 10%) if current_stage
    // flaps between parsing_document and other stages on each poll — that read as a blink.
    const fill =
      p > 0
        ? Math.max(p, 8)
        : 10
    return { label: p > 0 ? `${p}%` : 'Processing…', fill: Math.min(100, fill) }
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
