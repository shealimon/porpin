import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  PartyPopper,
  Sparkles,
  Wand2,
  Wallet,
} from 'lucide-react'
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
import { PorpinMark } from '@/components/brand/PorpinMark'
import {
  dashboardLabelForTranslationTarget,
  readStoredTranslationTarget,
} from '@/features/upload/sourceLang'
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

type PipelineStep = 'prepare' | 'translate' | 'finalize'

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

function resolvePipelineStep(status: string | undefined, phase: Phase): PipelineStep {
  if (phase === 'completed') return 'finalize'
  const s = normalizeJobStatus(status)
  if (s === 'estimated' || s === 'preview_ready') return 'prepare'
  if (s === 'queued' || s === 'parsing_document' || s === 'processing') return 'translate'
  if (s === 'stitching' || s === 'generating_file') return 'finalize'
  if (phase === 'loading' || phase === 'starting') return 'prepare'
  return 'translate'
}

/** Map stored job errors to copy users can act on (OpenAI 429s are common). */
function jobFailureCopy(raw: string | null | undefined): {
  primary: string
  detail?: string
} {
  const generic =
    'Something went wrong while converting your file. Try uploading again.'
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
        'The conversion service is temporarily busy (AI rate limit). Wait a short time and try again.',
      detail:
        'Large documents or many concurrent jobs can hit your OpenAI tokens-per-minute limit.',
    }
  }
  if (lower.includes('openai') && lower.includes('not configured')) {
    return {
      primary: 'Conversion is not fully configured on the server.',
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

  const historyRecord = useJobStore((s) => {
    if (!jobId) return null
    return s.history.find((h) => h.id === jobId) ?? null
  })

  const fileName = historyRecord?.fileName ?? null

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
    const storedTarget =
      useJobStore.getState().history.find((h) => h.id === jobId)?.translationTarget

    void (async () => {
      try {
        await confirmTranslationJob({
          jobId,
          words: j.totalWords ?? j.wordCount,
          amountToPay: j.amountToPay ?? j.estimatedCost,
          fileName,
          translationTarget: storedTarget ?? readStoredTranslationTarget(),
        })
        void queryClient.invalidateQueries({ queryKey: qk.jobs.detail(jobId) })
        await queryClient.refetchQueries({ queryKey: qk.jobs.detail(jobId) })
        const after = queryClient.getQueryData(
          qk.jobs.detail(jobId),
        ) as MilestoneJob | undefined
        const sAfter = normalizeJobStatus(after?.status)
        // If the server still looks pre-confirm, React Query can keep a stale `status` string
        // in deps so the effect would not re-run; bump the nonce a few times to call confirm again
        // or let the user use "Start conversion".
        if (sAfter === 'estimated' || sAfter === 'preview_ready') {
          kickoffAttempted.current = false
          if (preConfirmRefetchTries.current < 4) {
            preConfirmRefetchTries.current += 1
            setKickoffRetryNonce((x) => x + 1)
          } else {
            setKickoffError(
              'The job is still in "estimated" after starting. Check that the API (port 8000) is running, then click Start conversion below or refresh the page.',
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
  const isActiveProcessing =
    !kickoffBlocked &&
    phase !== 'awaiting_payment' &&
    !isTerminalSuccess &&
    !isTerminalFail &&
    progressFill < 100

  const historyTarget = useJobStore((s) => {
    if (!jobId) return null
    return s.history.find((h) => h.id === jobId)?.translationTarget ?? null
  })

  // Local selected target (persisted on Upload page). Keep it in state so the headline
  // never falls back to Hinglish while the first post-confirm poll is in flight.
  const [clientSelectedTarget, setClientSelectedTarget] = useState(() =>
    readStoredTranslationTarget(),
  )

  useEffect(() => {
    // Storage events only fire across tabs/windows, but this still keeps things correct
    // if the user started the job from another tab.
    const update = () => setClientSelectedTarget(readStoredTranslationTarget())
    update()
    window.addEventListener('storage', update)
    return () => window.removeEventListener('storage', update)
  }, [])

  useEffect(() => {
    if (historyTarget) setClientSelectedTarget(historyTarget)
  }, [historyTarget])

  const [serverTargetConfirmed, setServerTargetConfirmed] = useState(false)

  useEffect(() => {
    // Once the server reports the same target as the client selection, we can trust
    // server value going forward (covers DB defaults briefly reporting hinglish).
    const serverT = job?.translationTarget
    if (!serverT) return
    if (serverT === clientSelectedTarget) setServerTargetConfirmed(true)
  }, [job?.translationTarget, clientSelectedTarget])

  useEffect(() => {
    // New job id: reset confirmation gate.
    setServerTargetConfirmed(false)
  }, [jobId])

  // Prefer the client-selected target until the server has confirmed the same value at least once.
  const effectiveTranslationTarget = serverTargetConfirmed
    ? job?.translationTarget ?? historyTarget ?? clientSelectedTarget
    : historyTarget ?? clientSelectedTarget

  const outputStyleLabel = dashboardLabelForTranslationTarget(effectiveTranslationTarget)

  const pipelineStep = resolvePipelineStep(job?.status, phase)
  const stepIndex = pipelineStep === 'prepare' ? 0 : pipelineStep === 'translate' ? 1 : 2

  const canDownloadDocx = Boolean(jobId && phase === 'completed')
  const canDownloadPdf = Boolean(
    jobId && phase === 'completed' && job?.outputPdfAvailable,
  )

  const progressTitle = useMemo(() => {
    if (phase === 'loading') return 'Connecting…'
    if (phase === 'starting') return `Converting to ${outputStyleLabel}`
    if (phase === 'awaiting_payment') return 'Payment required'
    if (phase === 'polling') return `Converting to ${outputStyleLabel}`
    if (phase === 'completed') return `Your ${outputStyleLabel} version is ready`
    if (phase === 'failed') return 'Conversion failed'
    return 'Job progress'
  }, [phase, outputStyleLabel])

  const progressSubtitle = useMemo(() => {
    if (kickoffBlocked) return null
    if (phase === 'loading') return 'Connecting to the server and fetching job status.'
    if (phase === 'starting') return 'Preparing your document for conversion.'
    if (phase === 'polling') {
      const s = displayJob?.status ? jobStatusLabel(displayJob.status) : null
      return s ?? 'Working…'
    }
    return null
  }, [kickoffBlocked, phase, displayJob?.status])

  const stepUi = useMemo(() => {
    const steps: Array<{
      key: PipelineStep
      title: string
      subtitle: string
      Icon: typeof FileText
    }> = [
      { key: 'prepare', title: 'Prepare', subtitle: 'Read & parse', Icon: FileText },
      { key: 'translate', title: 'Convert', subtitle: 'AI conversion', Icon: Wand2 },
      { key: 'finalize', title: 'Finalize', subtitle: 'Stitch & export', Icon: Sparkles },
    ]
    return steps.map((s, i) => ({
      ...s,
      index: i,
      state: i < stepIndex ? 'done' : i === stepIndex ? 'active' : 'todo',
    }))
  }, [stepIndex])

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
        description: `Pay for conversion${fileName ? ` · ${fileName}` : ''}`,
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
        <div className="processing-flow__inner mx-auto box-border w-full min-w-0 max-w-xl px-4 sm:px-4">
          <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/85 p-4 shadow-[0_20px_50px_-28px_rgba(24,24,27,0.35)] backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/35 dark:shadow-[0_22px_60px_-30px_rgba(0,0,0,0.65)] sm:rounded-3xl sm:p-7">
            {!kickoffBlocked && phase !== 'awaiting_payment' && !isTerminalFail && !isTerminalSuccess ? (
              <div className="mb-5 text-center sm:text-left">
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="max-w-full truncate text-xs font-medium tracking-wide text-zinc-500 dark:text-zinc-400">
                      {fileName ? fileName : 'Conversion in progress'}
                    </p>
                    <h1 className="mt-2 text-balance font-display text-xl font-normal tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl">
                      {progressTitle}
                    </h1>
                    {progressSubtitle ? (
                      <p className="mx-auto mt-2 max-w-[34ch] text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:mx-0 sm:max-w-none">
                        {progressSubtitle}
                      </p>
                    ) : null}
                  </div>

                  <div className="shrink-0 self-center sm:self-start">
                    <div
                      className={cn(
                        'flex size-11 items-center justify-center rounded-2xl ring-1 shadow-sm',
                        phase === 'starting' || phase === 'loading' || phase === 'polling'
                          ? 'bg-brand-50/80 text-brand-700 ring-brand-200/70 dark:bg-brand-950/45 dark:text-brand-300 dark:ring-brand-800/55'
                          : 'bg-zinc-50/80 text-zinc-700 ring-zinc-200/70 dark:bg-zinc-900/50 dark:text-zinc-200 dark:ring-zinc-800/55',
                      )}
                      aria-hidden
                    >
                      <span
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center',
                          phase === 'starting' || phase === 'loading' || phase === 'polling'
                            ? 'porpin-loading-mark'
                            : '',
                        )}
                      >
                        <PorpinMark
                          className={cn(
                            'size-full',
                            phase === 'starting' || phase === 'loading' || phase === 'polling'
                              ? 'porpin-mark--loading'
                              : '',
                          )}
                        />
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3"
                  aria-label="Pipeline steps"
                >
                  {stepUi.map((s) => (
                    <div
                      key={s.key}
                      className={cn(
                        'min-w-0 rounded-2xl border px-3 py-3 transition-all sm:px-3 sm:py-2.5',
                        s.state === 'done' &&
                          'border-emerald-200/70 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/25',
                        s.state === 'active' &&
                          'border-brand-400/80 bg-brand-100/90 ring-2 ring-brand-300/70 shadow-[0_6px_22px_-8px_rgba(37,99,235,0.45)] sm:border-brand-300/70 sm:bg-brand-50/70 sm:ring-1 sm:ring-brand-200/70 sm:shadow-[0_3px_14px_-10px_rgba(37,99,235,0.35)] dark:border-brand-600/70 dark:bg-brand-950/40 dark:ring-brand-700/60 dark:sm:bg-brand-950/25 dark:sm:ring-brand-800/55 dark:shadow-[0_8px_24px_-10px_rgba(59,130,246,0.45)] dark:sm:shadow-[0_3px_16px_-12px_rgba(59,130,246,0.3)]',
                        s.state === 'todo' &&
                          'border-zinc-200/70 bg-white/30 dark:border-zinc-800/55 dark:bg-zinc-950/15',
                      )}
                    >
                      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 sm:grid-cols-[auto_minmax(0,1fr)]">
                        <div
                          className={cn(
                            'flex size-8 items-center justify-center rounded-xl ring-1',
                            s.state === 'done' &&
                              'bg-emerald-600 text-white ring-emerald-500/40 dark:bg-emerald-500 dark:ring-emerald-400/35',
                            s.state === 'active' &&
                              'bg-brand-600 text-white ring-brand-500/40 dark:bg-brand-500 dark:ring-brand-400/35',
                            s.state === 'todo' &&
                              'bg-zinc-100 text-zinc-700 ring-zinc-200/70 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-800/55',
                            s.state === 'active' ? 'animate-pulse' : '',
                          )}
                          aria-hidden
                        >
                          <s.Icon className="size-4" strokeWidth={2.1} />
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 sm:text-[12px]">
                            {s.title}
                          </p>
                          <p
                            className={cn(
                              'mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 sm:text-[11px]',
                              s.state === 'active'
                                ? 'font-medium text-brand-700 dark:text-brand-300'
                                : '',
                            )}
                          >
                            {s.subtitle}
                          </p>
                        </div>
                        {s.state === 'active' ? (
                          <span className="inline-flex shrink-0 items-center rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white dark:bg-brand-500 sm:hidden">
                            In progress
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5">
                  <div className="flex flex-col items-center gap-1 text-center sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:text-left">
                    <p className="text-sm font-semibold tabular-nums text-brand-700 dark:text-brand-300">
                      {progressLabel}
                    </p>
                    {showLiveElapsed ? (
                      <p className="text-xs font-medium tabular-nums text-zinc-500 dark:text-zinc-400">
                        Time: {formatDurationSeconds(liveElapsedSeconds)}
                      </p>
                    ) : null}
                  </div>
                  <div
                    className="processing-flow__bar mt-2"
                    role="progressbar"
                    aria-valuenow={displayJob?.progressPercent ?? 0}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Conversion progress"
                  >
                    <div
                      className={cn(
                        'processing-flow__bar-fill',
                        isActiveProcessing ? 'processing-flow__bar-fill--active' : '',
                      )}
                      style={{ width: `${progressFill}%` }}
                    />
                  </div>
                  <p className="processing-flow__hint mt-4 max-w-none text-center sm:max-w-none sm:text-left">
                    You can leave this page and return from History anytime.
                  </p>
                </div>
              </div>
            ) : null}

            {kickoffBlocked ? (
              <div className="processing-flow__error-card">
                <h1 className="processing-flow__title">Could not start conversion</h1>
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
                    <span className="porpin-loading-mark flex size-4 shrink-0 items-center justify-center">
                      <PorpinMark className="size-full porpin-mark--loading" aria-hidden />
                    </span>
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

            {!kickoffBlocked && !isTerminalSuccess && !isTerminalFail && phase !== 'awaiting_payment' ? (
              <>
                {isPreConfirm && !kickoffInFlight ? (
                  <p className="mt-3 text-left text-pretty text-sm text-zinc-600 dark:text-zinc-400">
                    If the job stays on “Starting” for more than a few seconds, you can manually
                    trigger it.{' '}
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
                      Start conversion
                    </button>
                    .
                  </p>
                ) : null}
                {isPreConfirm && kickoffInFlight ? (
                  <p className="mt-3 text-left text-sm text-zinc-500 dark:text-zinc-500">
                    Sending start request to the server…
                  </p>
                ) : null}
              </>
            ) : null}

            {isTerminalSuccess && (
              <div className="processing-flow__done mx-auto flex w-full flex-col items-center gap-5 text-center sm:gap-7">
            <div className="flex items-center justify-center gap-3 sm:gap-4" aria-hidden>
              <div className="text-amber-500/90 dark:text-amber-300/90">
                <PartyPopper className="size-6 sm:size-7" strokeWidth={1.9} />
              </div>
              <div className="flex size-14 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-sm ring-1 ring-black/10 dark:bg-zinc-50 dark:text-zinc-900 dark:ring-white/10 sm:size-16">
                <PorpinMark className="size-9 sm:size-10" />
              </div>
              <div className="text-brand-600/80 dark:text-brand-300/85">
                <Sparkles className="size-6 sm:size-7" strokeWidth={1.9} />
              </div>
            </div>
            <div className="w-full">
              <h1 className="font-display text-[clamp(1.5rem,4.5vw,1.95rem)] font-normal leading-snug tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
                Your {outputStyleLabel} version is ready
              </h1>
              <p className="mt-3 text-pretty font-sans text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Download your converted file below
              </p>
            </div>
            <div
              className="flex size-12 items-center justify-center rounded-2xl bg-brand-50/95 text-brand-700 ring-1 ring-brand-200/85 shadow-sm dark:bg-brand-950/50 dark:text-brand-300 dark:ring-brand-800/55 sm:size-14"
              aria-hidden
            >
              <CheckCircle2 className="size-7 sm:size-8" strokeWidth={1.8} />
            </div>
            <div className="flex w-full flex-col gap-5">
              {job != null && job.translationDurationSeconds != null ? (
                <p className="font-sans text-sm font-normal leading-snug text-zinc-500 dark:text-zinc-400">
                  Processing time: {formatDurationSeconds(job.translationDurationSeconds)}
                </p>
              ) : null}
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-center sm:gap-3">
                {canDownloadPdf ? (
                  <button
                    type="button"
                    onClick={onDownloadPdf}
                    disabled={downloadBusy !== null}
                    className={cn(
                      'processing-flow__download inline-flex h-10 w-full shrink-0 cursor-pointer appearance-none items-center justify-center gap-2 rounded-lg border-0 px-5 text-sm font-semibold text-white transition',
                      'bg-brand-600 shadow-md shadow-black/10',
                      'hover:bg-brand-700 hover:shadow-lg hover:shadow-black/15',
                      'dark:bg-brand-600 dark:hover:bg-brand-500',
                      'active:scale-[0.98]',
                      'outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400/50 dark:focus-visible:outline-zinc-500/50',
                      'disabled:pointer-events-none disabled:opacity-60',
                      'sm:w-auto',
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
                      'processing-flow__download inline-flex h-10 w-full shrink-0 cursor-pointer appearance-none items-center justify-center gap-2 rounded-lg border-0 px-5 text-sm font-semibold text-white transition',
                      'bg-emerald-600 shadow-md shadow-black/10',
                      'hover:bg-emerald-700 hover:shadow-lg hover:shadow-black/15',
                      'dark:bg-emerald-500 dark:hover:bg-emerald-400',
                      'active:scale-[0.98]',
                      'outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400/50 dark:focus-visible:outline-zinc-500/50',
                      'disabled:pointer-events-none disabled:opacity-60',
                      'sm:w-auto',
                    )}
                  >
                    <Download className="size-4 shrink-0" strokeWidth={2.25} aria-hidden />
                    Download DOCX
                  </button>
                ) : null}
              </div>
            </div>
            <div className="w-full pt-1 sm:flex sm:justify-center">
              <Link
                to="/app/upload"
                className={cn(
                  'processing-flow__download inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-zinc-100 px-5 text-sm font-semibold text-zinc-800 no-underline shadow-md shadow-black/10 transition sm:w-auto',
                  'hover:border-zinc-300 hover:bg-zinc-200/80',
                  'dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:shadow-black/15 dark:hover:border-zinc-500 dark:hover:bg-zinc-700',
                  'active:scale-[0.98]',
                )}
              >
                <ArrowLeft
                  className="size-4 shrink-0 text-zinc-700 dark:text-zinc-200"
                  strokeWidth={2.25}
                  aria-hidden
                />
                Back to upload
              </Link>
            </div>
              </div>
            )}

            {phase === 'failed' && failedCopy && (
              <div className="processing-flow__error-card">
            <h1 className="processing-flow__title">Conversion failed</h1>
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
            <div className="mt-4 w-full sm:flex sm:justify-center">
              <Link
                to="/app/upload"
                className={cn(
                  'processing-flow__download font-sans inline-flex min-h-[48px] w-full shrink-0 cursor-pointer appearance-none items-center justify-center gap-2 rounded-2xl border-0 bg-brand-600 px-5 py-3.5 text-sm font-semibold tracking-tight text-white no-underline shadow-sm shadow-zinc-900/10 transition sm:min-h-0 sm:w-auto sm:min-w-[11rem]',
                  'hover:bg-brand-700',
                  'dark:bg-brand-600 dark:shadow-black/20 dark:hover:bg-brand-500',
                  'active:scale-[0.98]',
                  'outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950',
                )}
              >
                New upload
              </Link>
            </div>
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
