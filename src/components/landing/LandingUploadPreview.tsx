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
/** Middle step: shorter on small screens so the row fits without clipping (overflow-x on #root). */
const STEP_LABELS_MOBILE = ['Estimate', 'Translate', 'Download'] as const
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
      className={cn('h-8 w-5 shrink-0 text-orange-700/85 sm:h-9', className)}
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

/**
 * Copy for the 3 file-bar controls — order: + · field · send.
 * `sub` is shown on desktop (sm+) only; mobile uses `label` alone so columns stay short.
 */
const FILE_BAR_CALLOUTS: {
  align: 'left' | 'center' | 'right'
  label: string
  sub: string
}[] = [
  { align: 'left', label: 'Add a file', sub: 'Tap + for PDF, DOCX, and more' },
  { align: 'center', label: 'Your file', sub: 'File name appears here' },
  { align: 'right', label: 'Start translation', sub: 'After you see the estimate' },
]

/** Same 3 column template as the file bar + arrow row: + · field · send (index.css, max-width: 639px). */
const FILE_BAR_HINT_GRID = cn(
  'mx-auto grid w-full min-w-0 max-w-[42rem] grid-cols-[2.75rem_1fr_2.75rem] gap-y-1.5',
  'gap-x-[0.35rem] px-[0.4rem]',
)

/** Desktop (sm+): one narrow column per control, arrow in that column. */
function CalloutWithArrow({
  label,
  sub,
  align,
}: {
  label: string
  sub: string
  align: 'left' | 'center' | 'right'
}) {
  return (
    <div
      className={cn(
        'flex w-full min-w-0 max-w-[9.5rem] flex-col gap-1.5',
        align === 'left' && 'items-start text-left',
        align === 'center' && 'items-center text-center',
        align === 'right' && 'items-end text-right',
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-800">{label}</p>
      <p className="w-full text-[11px] leading-snug text-stone-600 sm:max-w-none">{sub}</p>
      <div
        className={cn(
          'mt-0.5 flex w-full shrink-0',
          align === 'left' && 'justify-start',
          align === 'center' && 'justify-center',
          align === 'right' && 'justify-end',
        )}
      >
        <ArrowToBar />
      </div>
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

/**
 * Mobile: one grid — row 1 = short label only per column, row 2 = ↓.
 * Subtitles (Tap +…, File name…, After you see…) are desktop-only — see CalloutWithArrow.
 */
function MobileFileBarHintBlock() {
  return (
    <div className={cn(FILE_BAR_HINT_GRID, 'sm:hidden')}>
      {FILE_BAR_CALLOUTS.map((c, i) => (
        <div
          key={c.label}
          className={cn(
            'flex min-h-0 min-w-0 flex-col justify-end text-balance text-center',
            i === 1 && 'px-0.5',
          )}
        >
          <p
            className={cn(
              'font-semibold uppercase tracking-[0.12em] text-stone-800',
              i === 1 ? 'text-[11px] tracking-[0.14em]' : 'text-[9px] leading-tight',
            )}
          >
            {c.label}
          </p>
        </div>
      ))}
      {FILE_BAR_CALLOUTS.map((c) => (
        <div key={`arrow-${c.label}`} className="flex min-w-0 justify-center">
          <ArrowToBar />
        </div>
      ))}
    </div>
  )
}

/**
 * Estimate (step 0) explainers above the file bar.
 * Mobile: text + arrows share one 2-row grid. Desktop: 3 narrow columns with inline ↓.
 */
function EstimateStepCallouts() {
  return (
    <div className="relative z-[1] w-full min-w-0 sm:mb-1 sm:max-w-[42rem]">
      <MobileFileBarHintBlock />
      <div className="mb-0 hidden w-full min-w-0 sm:grid sm:grid-cols-3 sm:items-stretch sm:gap-x-3">
        {FILE_BAR_CALLOUTS.map((c) => (
          <CalloutWithArrow key={c.label} label={c.label} sub={c.sub} align={c.align} />
        ))}
      </div>
    </div>
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
      className="landing-upload-preview relative z-[1] w-full min-w-0 max-w-full overflow-x-clip rounded-2xl border border-orange-200/80 bg-white p-4 shadow-[0_28px_64px_-20px_rgba(234,88,12,0.18),0_16px_40px_-24px_rgba(15,23,42,0.12)] ring-2 ring-orange-100/90 ring-offset-2 ring-offset-[#f6f4f1] xs:p-5 sm:rounded-[1.25rem] sm:p-8"
      role="region"
      aria-label={liveLabel}
    >
      <div className="landing-upload-preview__filmstrip mb-5 w-full" aria-hidden>
        <div className="landing-upload-preview__filmstrip-inner" />
      </div>

      <div className="dashboard-home mx-auto flex w-full min-w-0 max-w-xl flex-col items-center px-0 pb-2 pt-1">
        <h2 className="font-display text-center text-[clamp(1.5rem,3.8vw,2rem)] font-normal leading-tight tracking-[-0.02em] text-stone-900">
          {greeting}
        </h2>
        <div className="mx-auto mt-2 max-w-[26rem] space-y-1 text-center text-sm leading-relaxed text-stone-700 sm:text-[0.9375rem]">
          <p className="mb-0">Upload your file to get instant word count & price</p>
          <p className="mb-0">Translate when you're ready</p>
        </div>

        <div className="relative mt-8 w-full sm:mt-10">
          <div
            className="pointer-events-none absolute -inset-px rounded-[calc(999px+4px)] bg-gradient-to-b from-orange-200/50 via-amber-100/20 to-transparent opacity-95"
            aria-hidden
          />

          {!reducedMotion ? (
            <div className="mb-4 flex flex-col items-center gap-2">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-stone-600">
                How it runs
              </p>
              <div
                className="flex max-w-full flex-wrap items-center justify-center gap-x-1 gap-y-1.5 px-0.5 sm:gap-x-2 sm:gap-y-2 sm:px-0"
                aria-hidden
              >
                {STEP_LABELS.map((label, i) => (
                  <div key={label} className="flex min-w-0 items-center gap-1 sm:gap-2">
                    {i > 0 ? (
                      <span className="shrink-0 text-orange-600/80" aria-hidden>
                        →
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        'rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] transition-colors duration-500 sm:px-2.5 sm:text-[10px] sm:tracking-[0.12em]',
                        step === i
                          ? 'bg-stone-900 text-white shadow-sm shadow-stone-900/20'
                          : 'bg-orange-50/90 text-stone-700 ring-1 ring-orange-200/70',
                      )}
                    >
                      <span className="sm:hidden">{STEP_LABELS_MOBILE[i]}</span>
                      <span className="hidden sm:inline">{label}</span>
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
                <div className="relative z-[1] w-full min-w-0 max-sm:mb-1.5">
                  <EstimateStepCallouts />
                </div>
                <div className="relative z-[1] w-full">
                  <div className="file-input-bar-stack">
                    <EstimateFileBar />
                    <div className="mt-3 flex w-full max-w-[42rem] flex-col items-center gap-1">
                      <div className="flex flex-col items-center text-center">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-800">
                          Words &amp; price
                        </p>
                        <svg
                          className="mt-1 h-7 w-5 text-orange-700/85"
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

                <div className="border-t border-orange-200/50 pt-8 text-center">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-stone-600">
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
                  <div className="relative z-[1] w-full min-w-0 max-sm:mb-1.5">
                    <EstimateStepCallouts />
                  </div>
                  <div className="relative z-[1] w-full">
                    <div className="file-input-bar-stack">
                      <EstimateFileBar />
                      <div className="mt-3 flex w-full max-w-[42rem] flex-col items-center gap-1">
                        <div className="flex flex-col items-center text-center">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-800">
                            Words &amp; price
                          </p>
                          <svg
                            className="mt-1 h-7 w-5 text-orange-700/85"
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
                  <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-800">
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
                      <p className="mt-3 text-center text-xs leading-relaxed text-stone-600">
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
        <p className="font-display text-lg font-normal tracking-tight text-stone-900 sm:text-xl">
          Your Hinglish version is ready 🎉
        </p>
        <p className="mt-1 text-sm text-stone-700">Download your translated file below</p>
      </div>
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <span
          className={cn(
            'font-display inline-flex flex-1 items-center justify-center gap-2 rounded-xl border-0 px-4 py-3 text-sm font-normal tracking-tight',
            'bg-[var(--text-h)] text-white shadow-md shadow-black/20',
            'dark:bg-zinc-950 dark:shadow-black/40',
          )}
        >
          <Download className="size-4 shrink-0" strokeWidth={2.25} aria-hidden />
          Download PDF
        </span>
        <span
          className={cn(
            'font-display inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm',
            'text-sm font-normal tracking-tight text-stone-800',
          )}
        >
          <Download className="size-4 shrink-0 opacity-90" strokeWidth={2.25} aria-hidden />
          Download DOCX
        </span>
      </div>
    </div>
  )
}
