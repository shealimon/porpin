import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { estimatePaygInrWholeRupees } from '@/lib/paygPricing'
import { cn } from '@/lib/utils'
import { getGreetingPhrase } from '@/utils/greeting'

/** Matches `FileInputBar` / billing copy (en-IN). */
function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(amount)
}

const DEMO_WORD_COUNT = 10_000
const DEMO_CHARGE_INR = estimatePaygInrWholeRupees(DEMO_WORD_COUNT)

const STEP_LABELS = ['Estimate', 'Translating', 'Download'] as const
const STEP_MS = 4200

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduced(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  return reduced
}

/** Hand-drawn style arrow pointing down (SVG path). */
function ArrowToBar({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-9 w-5 shrink-0 text-zinc-600', className)}
      viewBox="0 0 20 36"
      fill="none"
      aria-hidden
    >
      <path
        d="M10 4v18M4 22c2 3 4 5 6 8M16 22c-2 3-4 5-6 8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Callout({
  label,
  sub,
  align,
}: {
  label: string
  sub?: string
  align: 'left' | 'center' | 'right'
}) {
  return (
    <div
      className={cn(
        'flex max-w-[9.5rem] flex-col gap-1',
        align === 'left' && 'items-start text-left',
        align === 'center' && 'items-center text-center',
        align === 'right' && 'items-end text-right',
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-800">
        {label}
      </p>
      {sub ? <p className="text-[11px] leading-snug text-zinc-600">{sub}</p> : null}
      <ArrowToBar
        className={cn(
          align === 'left' && 'self-start',
          align === 'center' && 'self-center',
          align === 'right' && 'self-end',
        )}
      />
    </div>
  )
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Same pill as the app: add file → field → start translation. */
function EstimateFileBar() {
  return (
    <div className="file-input-bar pointer-events-none select-none" aria-hidden>
      <div className="file-input-bar__action file-input-bar__action--plus" aria-hidden>
        <PlusIcon />
      </div>
      <div className="file-input-bar__field" title="Upload any file">
        <span className="file-input-bar__placeholder">Upload any file</span>
      </div>
      <div
        className="file-input-bar__action file-input-bar__action--send file-input-bar__action--send-active"
        aria-hidden
      >
        <SendIcon />
      </div>
    </div>
  )
}

export function LandingUploadPreview() {
  const greeting = getGreetingPhrase()
  const chargeDisplay = formatInr(DEMO_CHARGE_INR)
  const reducedMotion = usePrefersReducedMotion()
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (reducedMotion) return
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % 3)
    }, STEP_MS)
    return () => window.clearInterval(id)
  }, [reducedMotion])

  const liveLabel = reducedMotion
    ? 'Preview: upload, estimate, translate, then download DOCX or PDF.'
    : `Preview step ${step + 1} of 3: ${STEP_LABELS[step]}. Upload, estimate, translate, then download.`

  const estimateCard = (
    <div className="file-input-bar__estimate-card w-full space-y-2">
      <div className="file-input-bar__estimate-metrics">
        <p className="file-input-bar__estimate-line">
          <span className="file-input-bar__estimate-label">Detected words</span>
          <span className="file-input-bar__estimate-value">
            {DEMO_WORD_COUNT.toLocaleString('en-IN')}
          </span>
        </p>
        <p className="file-input-bar__estimate-line">
          <span className="file-input-bar__estimate-label">Estimated price</span>
          <span className="file-input-bar__estimate-value file-input-bar__estimate-value--price">
            {chargeDisplay}
          </span>
        </p>
      </div>
    </div>
  )

  return (
    <div
      className="landing-upload-preview rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.12)] ring-1 ring-zinc-100 sm:p-8"
      role="region"
      aria-label={liveLabel}
    >
      <div className="landing-upload-preview__filmstrip mb-5 w-full" aria-hidden>
        <div className="landing-upload-preview__filmstrip-inner" />
      </div>

      <div className="dashboard-home mx-auto flex w-full max-w-xl flex-col items-center px-0 pb-2 pt-1">
        <h2 className="font-display text-center text-[clamp(1.5rem,3.8vw,2rem)] font-normal leading-tight tracking-[-0.02em] text-zinc-900">
          {greeting}
        </h2>
        <div className="mx-auto mt-2 max-w-[26rem] space-y-1 text-center text-sm leading-relaxed text-zinc-700 sm:text-[0.9375rem]">
          <p className="mb-0">Upload your file to get instant word count & price</p>
          <p className="mb-0">Translate when you're ready</p>
        </div>

        <div className="relative mt-8 w-full sm:mt-10">
          <div
            className="pointer-events-none absolute -inset-px rounded-[calc(999px+4px)] bg-gradient-to-b from-zinc-300/35 via-transparent to-transparent opacity-80"
            aria-hidden
          />

          {!reducedMotion ? (
            <div className="mb-4 flex flex-col items-center gap-2">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                How it runs
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2" aria-hidden>
                {STEP_LABELS.map((label, i) => (
                  <div key={label} className="flex items-center gap-2">
                    {i > 0 ? (
                      <span className="text-zinc-500" aria-hidden>
                        →
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors duration-500',
                        step === i
                          ? 'bg-zinc-900 text-white'
                          : 'text-zinc-600',
                      )}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div
            className={cn(
              'relative w-full',
              reducedMotion ? 'space-y-10' : 'min-h-[min(420px,70vh)] sm:min-h-[380px]',
            )}
          >
            {/* Reduced motion: show full story without cycling */}
            {reducedMotion ? (
              <>
                <div className="relative z-[1] mb-1 grid w-full max-w-[42rem] grid-cols-3 gap-x-1 sm:gap-x-3">
                  <Callout align="left" label="Add a file" sub="Tap + for PDF, DOCX, and more" />
                  <Callout align="center" label="Your file" sub="File name appears here" />
                  <Callout align="right" label="Start translation" sub="After you see the estimate" />
                </div>
                <div className="relative z-[1] w-full">
                  <div className="file-input-bar-stack">
                    <EstimateFileBar />
                    <div className="mt-3 flex w-full max-w-[42rem] flex-col items-center gap-1">
                      <div className="flex flex-col items-center text-center">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-800">
                          Words &amp; price
                        </p>
                        <svg
                          className="mt-1 h-7 w-5 text-zinc-600"
                          viewBox="0 0 20 28"
                          fill="none"
                          aria-hidden
                        >
                          <path
                            d="M10 4v14M5 18l5 5 5-5"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      {estimateCard}
                    </div>
                  </div>
                </div>

                <div className="border-t border-zinc-200/80 pt-8 text-center">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                    After translation completes
                  </p>
                  <DownloadDonePanel />
                </div>
              </>
            ) : (
              <>
                <div
                  className={cn(
                    'transition-opacity duration-700 ease-in-out',
                    step === 0 ? 'relative z-[2] opacity-100' : 'pointer-events-none absolute inset-0 z-0 opacity-0',
                  )}
                  aria-hidden={step !== 0}
                >
                  <div className="relative z-[1] mb-1 grid w-full max-w-[42rem] grid-cols-3 gap-x-1 sm:gap-x-3">
                    <Callout align="left" label="Add a file" sub="Tap + for PDF, DOCX, and more" />
                    <Callout align="center" label="Your file" sub="File name appears here" />
                    <Callout align="right" label="Start translation" sub="After you see the estimate" />
                  </div>
                  <div className="relative z-[1] w-full">
                    <div className="file-input-bar-stack">
                      <EstimateFileBar />
                      <div className="mt-3 flex w-full max-w-[42rem] flex-col items-center gap-1">
                        <div className="flex flex-col items-center text-center">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-800">
                            Words &amp; price
                          </p>
                          <svg
                            className="mt-1 h-7 w-5 text-zinc-600"
                            viewBox="0 0 20 28"
                            fill="none"
                            aria-hidden
                          >
                            <path
                              d="M10 4v14M5 18l5 5 5-5"
                              stroke="currentColor"
                              strokeWidth="1.75"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                        {estimateCard}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    'flex flex-col items-center justify-center transition-opacity duration-700 ease-in-out',
                    step === 1
                      ? 'relative z-[2] min-h-[220px] opacity-100 sm:min-h-[260px]'
                      : 'pointer-events-none absolute inset-0 z-0 opacity-0',
                  )}
                  aria-hidden={step !== 1}
                >
                  <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-800">
                    Translating on the job page
                  </p>
                  <div className="file-input-bar-stack w-full max-w-[42rem]">
                    <div className="file-input-bar pointer-events-none select-none file-input-bar--busy" aria-hidden>
                      <div className="file-input-bar__action file-input-bar__action--plus" aria-hidden>
                        <PlusIcon />
                      </div>
                      <div className="file-input-bar__field">
                        <span className="file-input-bar__filename text-center">
                          Converting your document into natural Hinglish…
                        </span>
                      </div>
                      <div className="file-input-bar__action file-input-bar__action--send" aria-hidden>
                        <span className="file-input-bar__spinner" />
                      </div>
                    </div>
                    <div className="landing-upload-preview__progress mt-6 w-full">
                      <p
                        className="processing-flow__percent mb-3 text-[1.65rem] font-bold leading-none"
                        aria-live="polite"
                      >
                        68%
                      </p>
                      <div
                        className="processing-flow__bar w-full max-w-none"
                        role="progressbar"
                        aria-valuenow={68}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Translation progress"
                      >
                        <div className="processing-flow__bar-fill" style={{ width: '68%' }} />
                      </div>
                      <p className="mt-3 text-center text-xs leading-relaxed text-zinc-600">
                        Same progress bar as the live job page — then your files are ready to download.
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    'flex flex-col items-center justify-center transition-opacity duration-700 ease-in-out',
                    step === 2
                      ? 'relative z-[2] min-h-[280px] opacity-100 sm:min-h-[300px]'
                      : 'pointer-events-none absolute inset-0 z-0 opacity-0',
                  )}
                  aria-hidden={step !== 2}
                >
                  <DownloadDonePanel />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function DownloadDonePanel() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-1 pt-2">
      <div className="text-center">
        <p className="font-display text-lg font-normal tracking-tight text-zinc-900 sm:text-xl">
          Your Hinglish version is ready 🎉
        </p>
        <p className="mt-1 text-sm text-zinc-700">Download your translated file below</p>
      </div>
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <span
          className={cn(
            'inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold',
            'bg-zinc-900 text-white shadow-sm',
          )}
        >
          <Download className="size-4 shrink-0" strokeWidth={2.25} aria-hidden />
          Download PDF
        </span>
        <span
          className={cn(
            'inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3',
            'text-sm font-semibold text-zinc-800',
          )}
        >
          <Download className="size-4 shrink-0 opacity-90" strokeWidth={2.25} aria-hidden />
          Download DOCX
        </span>
      </div>
    </div>
  )
}
