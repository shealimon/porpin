import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type MutableRefObject,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { postPdfUpload, getUploadErrorMessage } from '@/features/upload/api'
import {
  readStoredTranslationTarget,
  writeStoredTranslationTarget,
  type TranslationTarget,
} from '@/features/upload/sourceLang'
import { SourceLangChips } from '@/components/SourceLangChips'
import { PaygPricingCalculator } from '@/components/PaygPricingCalculator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { usePricingConfig } from '@/hooks/usePricingConfig'
import { qk } from '@/lib/queryKeys'
import { queryClient } from '@/lib/queryClient'
import { useJobStore } from '@/stores/jobStore'
import { cn } from '@/lib/utils'
const PAYG_ACCEPT: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'application/epub+zip': ['.epub', '.ebup'],
  'text/markdown': ['.md'],
}

function rejectionMessage(rejections: FileRejection[], maxMb: number): string {
  const r = rejections[0]
  if (!r) return 'File was not accepted.'
  const code = r.errors[0]?.code
  if (code === 'file-too-large') {
    return maxMb > 0
      ? `Maximum file size is ${maxMb} MB.`
      : 'This file exceeds the maximum size your browser or network allows.'
  }
  if (code === 'file-invalid-type') {
    return 'Use PDF, DOCX, TXT, EPUB, or Markdown.'
  }
  return r.errors[0]?.message ?? 'File was not accepted.'
}

function formatInr(amount: number): string {
  const n = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
  return `₹${n}`
}

function isPaygAllowedFile(file: File): boolean {
  const n = file.name.toLowerCase()
  return (
    n.endsWith('.pdf') ||
    n.endsWith('.docx') ||
    n.endsWith('.txt') ||
    n.endsWith('.epub') ||
    n.endsWith('.ebup') ||
    n.endsWith('.md')
  )
}

type FileInputBarProps = {
  /** When user picks a file for a new upload, parent can hide stale job-status UI below the bar. */
  onWorkingFileChange?: (file: File | null) => void
  /** Rendered inside the drag-and-drop target (e.g. dashboard hero above the upload stack). */
  top?: ReactNode
  /** Classes for the outer drop target (e.g. dashboard inner width wrapper). */
  dropTargetClassName?: string
  /** Extra classes on the pill / chips / estimate column (e.g. mobile bottom anchoring). */
  uploadStackClassName?: string
  /** Large bordered composer card + chips like Claude.ai new chat (dashboard upload only). */
  composerStyle?: boolean
}

export function FileInputBar({
  onWorkingFileChange,
  top,
  dropTargetClassName,
  uploadStackClassName,
  composerStyle = false,
}: FileInputBarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const navigate = useNavigate()
  const { pricing } = usePricingConfig()
  const [file, setFile] = useState<File | null>(null)
  const [estimating, setEstimating] = useState(false)
  const [payAck, setPayAck] = useState(false)
  const [estimate, setEstimate] = useState<{
    job_id: string
    word_count: number
    estimated_cost: number
    file_name: string
    total_words: number
    free_used: number
    subscription_used: number
    remaining_words: number
    amount_to_pay: number
    user_plan_type: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [translationTarget, setTranslationTarget] = useState<TranslationTarget>(() =>
    readStoredTranslationTarget(),
  )
  const estimateReqId = useRef(0)
  const progressRaf = useRef<number | null>(null)
  const progressPending = useRef<number | null>(null)
  const [uploadUi, setUploadUi] = useState<{
    pct: number
    phase: 'upload' | 'processing'
  } | null>(null)

  const flushUploadProgress = useCallback(() => {
    progressRaf.current = null
    const p = progressPending.current
    if (p == null) return
    setUploadUi((prev) => {
      if (!prev) return prev
      const phase = p >= 100 ? ('processing' as const) : ('upload' as const)
      return { pct: Math.min(100, p), phase }
    })
  }, [])

  const onUploadProgressTick = useCallback(
    (pct: number) => {
      progressPending.current = pct
      if (progressRaf.current == null) {
        progressRaf.current = requestAnimationFrame(flushUploadProgress)
      }
    },
    [flushUploadProgress],
  )

  const paygFileValidator = useCallback((f: File) => {
    if (isPaygAllowedFile(f)) return null
    return {
      code: 'file-invalid-type',
      message: 'Use PDF, DOCX, TXT, EPUB, or Markdown.',
    } as const
  }, [])

  const onTranslationTargetChange = useCallback(
    (v: TranslationTarget) => {
      writeStoredTranslationTarget(v)
      setTranslationTarget(v)
      const jobId = estimate?.job_id
      if (!jobId) return
      const store = useJobStore.getState()
      const existing = store.history.find((h) => h.id === jobId)
      if (!existing) return
      store.upsertHistory({
        ...existing,
        translationTarget: v,
      })
    },
    [estimate?.job_id],
  )

  useEffect(() => {
    onWorkingFileChange?.(file)
  }, [file, onWorkingFileChange])

  useEffect(() => {
    setPayAck(false)
  }, [estimate?.job_id])

  const onDrop = useCallback((accepted: File[]) => {
    const next = accepted[0]
    if (!next) return
    setFile(next)
    setEstimate(null)
    setError(null)
  }, [])

  const onDropRejected = useCallback(
    (rejections: FileRejection[]) => {
      setError(rejectionMessage(rejections, pricing.max_upload_file_mb))
    },
    [pricing.max_upload_file_mb],
  )

  const maxBytes =
    pricing.max_upload_file_mb > 0 ? pricing.max_upload_file_mb * 1024 * 1024 : undefined

  /** True while a request is in flight and we have not applied its estimate yet. */
  const waitingForEstimate = estimating && !estimate

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    noClick: true,
    noKeyboard: true,
    accept: PAYG_ACCEPT,
    maxSize: maxBytes,
    maxFiles: 1,
    disabled: waitingForEstimate,
    multiple: false,
    validator: paygFileValidator,
  })
  const { ref: dzInputRef, ...dropzoneInputProps } =
    getInputProps() as ComponentPropsWithRef<'input'>

  const estimateJobBilling = useMemo(
    () =>
      estimate
        ? {
            totalWords: estimate.total_words ?? estimate.word_count,
            freeUsed: estimate.free_used,
            subscriptionUsed: estimate.subscription_used,
            amountToPay: estimate.amount_to_pay,
            userPlanType: estimate.user_plan_type,
          }
        : undefined,
    [estimate],
  )

  useEffect(() => {
    if (!file) {
      setEstimating(false)
      return
    }
    const id = ++estimateReqId.current
    const controller = new AbortController()
    // Hard cap: if axios never settles (proxy/network edge cases), still unblock the UI.
    const hardCapMs = 125_000
    let hardCapFired = false
    const hardCapTimer = window.setTimeout(() => {
      if (estimateReqId.current !== id) return
      hardCapFired = true
      controller.abort()
    }, hardCapMs)

    progressPending.current = null
    if (progressRaf.current != null) {
      cancelAnimationFrame(progressRaf.current)
      progressRaf.current = null
    }

    ;(async () => {
      setEstimating(true)
      setUploadUi({ pct: 0, phase: 'upload' })
      setError(null)
      try {
        const data = await postPdfUpload(file, onUploadProgressTick, controller.signal)
        if (estimateReqId.current !== id) return
        setEstimate({
          job_id: data.job_id,
          word_count: data.word_count,
          estimated_cost: data.estimated_cost,
          file_name: data.file_name,
          total_words: data.total_words,
          free_used: data.free_used,
          subscription_used: data.subscription_used,
          remaining_words: data.remaining_words,
          amount_to_pay: data.amount_to_pay,
          user_plan_type: data.user_plan_type,
        })
        // Clear progress immediately so we never get stuck on “Counting words…” if a stale
        // request’s `finally` skips (estimateReqId mismatch) after a race or abort.
        setUploadUi(null)
        setEstimating(false)
        const latestTarget = readStoredTranslationTarget()
        useJobStore.getState().upsertHistory({
          id: data.job_id,
          fileName: data.file_name,
          status: 'estimated',
          createdAt: new Date().toISOString(),
          translationTarget: latestTarget,
          amountCents: Math.round(data.estimated_cost * 100),
          currency: 'INR',
        })
        void queryClient.invalidateQueries({ queryKey: qk.jobs.all })
      } catch (e) {
        if (estimateReqId.current !== id) return
        if (axios.isCancel(e)) {
          if (hardCapFired) {
            setEstimate(null)
            setError(
              'Estimate timed out. Start the API on port 8000 (uvicorn), check the Vite proxy, or try a smaller PDF.',
            )
          }
          return
        }
        setEstimate(null)
        setError(getUploadErrorMessage(e))
      } finally {
        window.clearTimeout(hardCapTimer)
        if (progressRaf.current != null) {
          cancelAnimationFrame(progressRaf.current)
          progressRaf.current = null
        }
        progressPending.current = null
        if (estimateReqId.current === id) {
          setUploadUi(null)
          setEstimating(false)
        }
      }
    })()
    return () => {
      window.clearTimeout(hardCapTimer)
      if (progressRaf.current != null) {
        cancelAnimationFrame(progressRaf.current)
        progressRaf.current = null
      }
      progressPending.current = null
      controller.abort()
      // Aborted requests often skip setEstimating(false) in finally (stale id). Always clear
      // busy state on teardown; the next effect run sets it true again if a file is still selected.
      setUploadUi(null)
      setEstimating(false)
    }
  }, [file, onUploadProgressTick])

  const runEstimateAgain = useCallback(async () => {
    if (!file || waitingForEstimate) return
    setEstimating(true)
    setError(null)
    try {
      const data = await postPdfUpload(file)
      setEstimate({
        job_id: data.job_id,
        word_count: data.word_count,
        estimated_cost: data.estimated_cost,
        file_name: data.file_name,
        total_words: data.total_words,
        free_used: data.free_used,
        subscription_used: data.subscription_used,
        remaining_words: data.remaining_words,
        amount_to_pay: data.amount_to_pay,
        user_plan_type: data.user_plan_type,
      })
      const latestTarget = readStoredTranslationTarget()
      useJobStore.getState().upsertHistory({
        id: data.job_id,
        fileName: data.file_name,
        status: 'estimated',
        createdAt: new Date().toISOString(),
        translationTarget: latestTarget,
        amountCents: Math.round(data.estimated_cost * 100),
        currency: 'INR',
      })
      void queryClient.invalidateQueries({ queryKey: qk.jobs.all })
    } catch (e) {
      setEstimate(null)
      setError(getUploadErrorMessage(e))
    } finally {
      setEstimating(false)
    }
  }, [file, waitingForEstimate])

  const onStartTranslation = useCallback(() => {
    if (!estimate?.job_id || waitingForEstimate) return
    const needsPay = estimate.amount_to_pay > 0.005
    if (needsPay && !payAck) {
      toast.error('Please confirm payment authorisation to continue.')
      return
    }
    void queryClient.invalidateQueries({ queryKey: qk.jobs.detail(estimate.job_id) })
    navigate(`/app/jobs/${encodeURIComponent(estimate.job_id)}`)
  }, [estimate, waitingForEstimate, payAck, navigate])

  const onRightAction = useCallback(() => {
    if (estimate) {
      void onStartTranslation()
    } else if (file && !waitingForEstimate && error) {
      void runEstimateAgain()
    }
  }, [estimate, file, waitingForEstimate, error, onStartTranslation, runEstimateAgain])

  const needsPayAck = Boolean(estimate && estimate.amount_to_pay > 0.005)

  const showRightSpinner = waitingForEstimate
  const canStart = !!estimate && !waitingForEstimate && (!needsPayAck || payAck)
  const rightDisabled = !file || waitingForEstimate || (estimate ? !canStart : !error)

  const uploadTooltipText = useMemo(
    () => (waitingForEstimate ? 'Please wait' : 'Add file'),
    [waitingForEstimate],
  )

  const startActionTooltipText = useMemo(() => {
    if (!file) return 'Select a file first'
    if (waitingForEstimate) return 'Working…'
    if (error) return 'Retry estimate'
    if (!estimate) return 'Wait for estimate'
    if (needsPayAck) return 'Pay & Start'
    return 'Start'
  }, [file, waitingForEstimate, error, estimate, needsPayAck])

  return (
    <div
      {...getRootProps({
        className: cn(
          dropTargetClassName,
          'file-input-bar-drop-target outline-none',
          isDragActive && 'file-input-bar-drop-target--active',
        ),
        'aria-label': 'Drop a file here or use the add file button',
      })}
    >
      <input
        {...dropzoneInputProps}
        ref={(node) => {
          fileInputRef.current = node
          if (typeof dzInputRef === 'function') dzInputRef(node)
          else if (dzInputRef != null)
            (dzInputRef as MutableRefObject<HTMLInputElement | null>).current = node
        }}
      />
      {top}
      <div
        className={cn(
          'dashboard-home__upload-stack relative mt-7 w-full min-w-0 sm:mt-11',
          'has-[.file-input-bar__estimate-card]:mt-4 has-[.file-input-bar__estimate-card]:sm:mt-7',
          composerStyle && '!mt-5 sm:!mt-6 desk:!mt-5',
          uploadStackClassName,
        )}
      >
        {!composerStyle ? (
          <div
            className="pointer-events-none absolute -inset-px rounded-[calc(999px+4px)] bg-gradient-to-b from-amber-100/35 via-violet-50/15 to-transparent opacity-90 dark:from-amber-950/25 dark:via-violet-950/10 dark:to-transparent"
            aria-hidden
          />
        ) : null}
        <div className="relative w-full">
          <div className={cn('file-input-bar-stack', composerStyle && '!gap-5 sm:!gap-6')}>
            {composerStyle ? (
              <div
                className={cn(
                  'file-input-bar-composer box-border min-w-0 max-w-full outline-none ring-1 ring-black/[0.04] transition-[border-color,box-shadow,opacity] dark:ring-white/[0.045]',
                  /* Layered shadow: crisp edge + mid lift + soft background wash (dashboard pick-a-file) */
                  'w-full overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,.06),0_8px_28px_-8px_rgba(15,23,42,.1),0_28px_56px_-18px_rgba(24,24,27,.14)]',
                  'dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-[0_1px_0_rgba(255,255,255,.04)_inset,0_10px_36px_-12px_rgba(0,0,0,.42),0_32px_64px_-20px_rgba(0,0,0,.58)]',
                  isDragActive &&
                    'border-brand-400/65 ring-brand-400/35 shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary-soft)_80%,transparent),0_18px_44px_-14px_rgba(15,23,42,.12)] dark:border-brand-500/55 dark:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary-soft)_80%,transparent),0_24px_52px_-18px_rgba(0,0,0,.5)]',
                  waitingForEstimate && 'file-input-bar--busy opacity-[0.97]',
                  isDragActive && 'file-input-bar--drag',
                )}
              >
                <div className="min-h-[4.375rem] min-w-0 px-4 pb-2 pt-3.5 text-left sm:min-h-[5.125rem] sm:px-5 sm:pb-3 sm:pt-4">
                  <p
                    className={cn(
                      'line-clamp-4 text-[0.9375rem] leading-snug sm:text-base sm:leading-normal',
                      file
                        ? 'font-medium text-zinc-900 dark:text-zinc-100'
                        : 'font-normal text-zinc-400 dark:text-zinc-500',
                    )}
                    title={file?.name}
                  >
                    {waitingForEstimate && file
                      ? 'Calculating estimate…'
                      : file
                        ? file.name
                        : 'Pick a file.'}
                  </p>
                  {!file ? (
                    <p className="mt-2 text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
                      Drag here or tap +.
                    </p>
                  ) : null}
                </div>
                <div className="flex min-w-0 items-center gap-2 border-t border-zinc-200/80 px-3 py-2.5 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <Tooltip>
                    <TooltipTrigger
                      nativeButton={false}
                      render={
                        <span className="inline-flex shrink-0 rounded-full">
                          <button
                            type="button"
                            className="file-input-bar__action file-input-bar__action--plus"
                            aria-label="Add file"
                            disabled={waitingForEstimate}
                            onClick={(e) => {
                              e.stopPropagation()
                              fileInputRef.current?.click()
                            }}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                              <path
                                d="M12 5v14M5 12h14"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        </span>
                      }
                    />
                    <TooltipContent side="top" align="center">
                      {uploadTooltipText}
                    </TooltipContent>
                  </Tooltip>
                  {file || estimate ? (
                    <div className="min-w-0 shrink-0">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        {estimate ? 'Ready' : 'Estimate'}
                      </span>
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1" aria-hidden />
                  <Tooltip>
                    <TooltipTrigger
                      nativeButton={false}
                      render={
                        <span className="inline-flex shrink-0 rounded-full">
                          <button
                            type="button"
                            className={`file-input-bar__action file-input-bar__action--send${canStart ? ' file-input-bar__action--send-active' : ''}`}
                            aria-label={
                              estimate
                                ? needsPayAck
                                  ? 'Pay & Start'
                                  : 'Start'
                                : error
                                  ? 'Retry estimate'
                                  : 'Waiting for estimate'
                            }
                            disabled={rightDisabled}
                            onClick={(e) => {
                              e.stopPropagation()
                              onRightAction()
                            }}
                          >
                            {showRightSpinner ? (
                              <span className="file-input-bar__spinner" aria-hidden />
                            ) : (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                                <path
                                  d="M5 12h14M13 6l6 6-6 6"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </button>
                        </span>
                      }
                    />
                    <TooltipContent side="top" align="center">
                      {startActionTooltipText}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ) : (
              <div
                className={`file-input-bar${isDragActive ? ' file-input-bar--drag' : ''}${waitingForEstimate ? ' file-input-bar--busy' : ''}`}
              >
                <Tooltip>
                  <TooltipTrigger
                    nativeButton={false}
                    render={
                      <span className="inline-flex shrink-0 rounded-full">
                        <button
                          type="button"
                          className="file-input-bar__action file-input-bar__action--plus"
                          aria-label="Add file"
                          disabled={waitingForEstimate}
                          onClick={(e) => {
                            e.stopPropagation()
                            fileInputRef.current?.click()
                          }}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path
                              d="M12 5v14M5 12h14"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </span>
                    }
                  />
                  <TooltipContent side="top" align="center">
                    {uploadTooltipText}
                  </TooltipContent>
                </Tooltip>

                <div className="file-input-bar__field" title={file?.name}>
                  <span
                    className={
                      file ? 'file-input-bar__filename' : 'file-input-bar__placeholder'
                    }
                  >
                    {waitingForEstimate && file
                      ? 'Calculating estimate…'
                      : file
                        ? file.name
                        : 'Drag & drop a file here, or use + to browse'}
                  </span>
                </div>

                <Tooltip>
                  <TooltipTrigger
                    nativeButton={false}
                    render={
                      <span className="inline-flex shrink-0 rounded-full">
                        <button
                          type="button"
                          className={`file-input-bar__action file-input-bar__action--send${canStart ? ' file-input-bar__action--send-active' : ''}`}
                          aria-label={
                            estimate
                              ? needsPayAck
                                ? 'Pay & Start'
                                : 'Start'
                              : error
                                ? 'Retry estimate'
                                : 'Waiting for estimate'
                          }
                          disabled={rightDisabled}
                          onClick={(e) => {
                            e.stopPropagation()
                            onRightAction()
                          }}
                        >
                          {showRightSpinner ? (
                            <span className="file-input-bar__spinner" aria-hidden />
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                              <path
                                d="M5 12h14M13 6l6 6-6 6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </button>
                      </span>
                    }
                  />
                  <TooltipContent side="top" align="center">
                    {startActionTooltipText}
                  </TooltipContent>
                </Tooltip>
              </div>
            )}

      {uploadUi && !estimate ? (
        <div
          className="file-input-bar__upload-progress mx-auto w-full max-w-md px-0.5"
          aria-live="polite"
        >
          <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-200/90 dark:bg-zinc-700/90">
            <div
              className="h-full rounded-full bg-brand-600 transition-[width] duration-200 ease-out dark:bg-brand-500"
              style={{ width: `${uploadUi.pct}%` }}
            />
          </div>
          <p className="mt-2 text-center text-xs text-zinc-600 dark:text-zinc-400">
            {uploadUi.phase === 'upload'
              ? `Uploading… ${uploadUi.pct}%`
              : 'Counting words and price…'}
          </p>
        </div>
      ) : null}

      {file && waitingForEstimate && uploadUi?.phase === 'processing' ? (
        <div
          className="file-input-bar__estimate-card mx-auto mt-1 w-full max-w-sm animate-pulse rounded-xl border border-border/50 bg-muted/30 px-4 py-3 dark:border-zinc-700/80 dark:bg-zinc-900/40"
          aria-hidden
        >
          <div className="h-3 w-24 rounded bg-zinc-300/80 dark:bg-zinc-600/80" />
          <div className="mt-3 h-8 w-40 rounded-md bg-zinc-200/90 dark:bg-zinc-700/80" />
          <div className="mt-3 h-10 w-full rounded-lg bg-zinc-200/70 dark:bg-zinc-700/70" />
        </div>
      ) : null}

      <SourceLangChips
        value={translationTarget}
        onChange={onTranslationTargetChange}
        disabled={waitingForEstimate}
        className={cn(
          'file-input-bar__source-row',
          composerStyle && 'upload-home__composer-chips',
        )}
      />

      {estimate && (
        <div
          className="file-input-bar__estimate-card file-input-bar__estimate-card--billing flex flex-col gap-0"
          aria-live="polite"
        >
          <PaygPricingCalculator
            wordCount={estimate.word_count}
            disabled={waitingForEstimate}
            jobBilling={estimateJobBilling}
          />
          {estimate.remaining_words > 0 ? (
            <p className="mt-3 border-t border-border/60 pt-3 text-xs leading-snug text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
              Words left in your pool after this job:{' '}
              <strong className="font-semibold text-zinc-800 dark:text-zinc-200">
                {estimate.remaining_words.toLocaleString('en-IN')}
              </strong>
            </p>
          ) : null}
          {needsPayAck ? (
            <div className="mt-3 border-t border-border/60 pt-3 dark:border-zinc-700">
              <label className="flex cursor-pointer gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900/40">
                <input
                  type="checkbox"
                  checked={payAck}
                  onChange={(e) => setPayAck(e.target.checked)}
                  disabled={waitingForEstimate}
                  className="mt-0.5 size-4 rounded border-zinc-400"
                />
                <span className="text-zinc-800 dark:text-zinc-200">
                  I agree to pay{' '}
                  <strong className="font-semibold">
                    {formatInr(estimate.amount_to_pay)}
                  </strong>{' '}
                  for words in this file
                </span>
              </label>
            </div>
          ) : null}
        </div>
      )}

      {error && (
        <p className="file-input-bar__error" role="alert">
          {error}
        </p>
      )}
          </div>
        </div>
      </div>
    </div>
  )
}
