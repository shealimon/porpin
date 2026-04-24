import { memo } from 'react'

import {
  clampPaygQuoteWords,
  estimatePaygInrWholeRupees,
  formatPaygInrDisplay,
} from '@/lib/paygPricing'
import { cn } from '@/lib/utils'

/** Logged-in upload estimate: align UI with free / subscription / PAYG split from API. */
export type JobBillingBreakdown = {
  totalWords: number
  freeUsed: number
  subscriptionUsed: number
  /** INR charged for this job as PAYG (source of truth from backend). */
  amountToPay: number
  /** Backend plan bucket, e.g. mixed | free | payg */
  userPlanType?: string
}

export type PaygPricingCalculatorProps = {
  wordCount: number
  disabled?: boolean
  className?: string
  /** When set, shows “this job” billing instead of hypothetical all-PAYG for every word. */
  jobBilling?: JobBillingBreakdown
}

export const PaygPricingCalculator = memo(function PaygPricingCalculator({
  wordCount,
  disabled = false,
  className,
  jobBilling,
}: PaygPricingCalculatorProps) {
  const w = clampPaygQuoteWords(wordCount)
  const standalonePrice = w > 0 ? estimatePaygInrWholeRupees(w) : null

  const paygWords = jobBilling
    ? Math.max(
        0,
        Math.floor(jobBilling.totalWords) -
          Math.floor(jobBilling.freeUsed) -
          Math.floor(jobBilling.subscriptionUsed),
      )
    : w

  return (
    <div
      className={cn(
        'flex flex-col gap-0 text-left',
        disabled && 'pointer-events-none opacity-[0.65]',
        className,
      )}
    >
      {jobBilling ? (
        <JobBillingView jobBilling={jobBilling} paygWords={paygWords} />
      ) : (
        <StandaloneQuoteView w={w} priceInr={standalonePrice} />
      )}

      {!jobBilling ? (
        <p className="mt-3.5 flex gap-2.5 border-t border-border/60 pt-3.5 text-[0.6875rem] leading-relaxed text-muted-foreground">
          <span
            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500/70 dark:bg-brand-400/80"
            aria-hidden
          />
          <span>We bill from measured content in your file, not file size.</span>
        </p>
      ) : null}
    </div>
  )
})

function compactWordBreakdown(
  totalWords: number,
  freeUsed: number,
  subscriptionUsed: number,
  paygWords: number,
): string | null {
  const onlyPayg =
    paygWords > 0 && freeUsed === 0 && subscriptionUsed === 0 && paygWords === totalWords

  if (onlyPayg) {
    return null
  }

  const parts: string[] = []
  if (freeUsed > 0) {
    parts.push(`${freeUsed.toLocaleString('en-IN')} words (free)`)
  }
  if (subscriptionUsed > 0) {
    parts.push(`${subscriptionUsed.toLocaleString('en-IN')} words (subscription)`)
  }
  if (paygWords > 0) {
    parts.push(`${paygWords.toLocaleString('en-IN')} words (pay-as-you-go)`)
  }
  if (parts.length === 0) {
    return null
  }
  return parts.join(' · ')
}

function JobBillingView({
  jobBilling,
  paygWords,
}: {
  jobBilling: JobBillingBreakdown
  paygWords: number
}) {
  const { totalWords, freeUsed, subscriptionUsed, amountToPay } = jobBilling
  const pays = amountToPay > 0.005
  const paygRoundsToZero = paygWords > 0 && !pays
  const wordSplitLine = compactWordBreakdown(totalWords, freeUsed, subscriptionUsed, paygWords)

  return (
    <div className="w-full">
      <div>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          This file
        </p>
        <p className="mt-1 font-display text-2xl font-medium tabular-nums tracking-[-0.02em] text-foreground">
          {totalWords > 0 ? totalWords.toLocaleString('en-IN') : '—'}{' '}
          <span className="text-lg font-normal text-muted-foreground">words</span>
        </p>
        {wordSplitLine ? (
          <p className="mt-1.5 text-xs leading-snug text-muted-foreground">{wordSplitLine}</p>
        ) : null}
      </div>

      {pays ? (
        <div className="mt-3 border-t border-border/60 pt-3">
          <p className="text-xs font-medium text-muted-foreground">Pay-as-you-go</p>
          <p className="mt-1.5 font-display text-3xl font-semibold tabular-nums tracking-[-0.03em] text-foreground sm:text-4xl sm:tracking-[-0.04em]">
            {formatPaygInrDisplay(amountToPay, { minFractionDigits: 0, maxFractionDigits: 2 })}
          </p>
        </div>
      ) : paygRoundsToZero ? (
        <div className="mt-3 border-t border-border/60 pt-3 dark:border-zinc-700">
          <p className="text-sm font-medium text-foreground">No payment for this job</p>
          <p className="mt-1 text-xs text-muted-foreground">
            PAYG total rounds to ₹0 (whole rupees).
          </p>
        </div>
      ) : (
        <div className="mt-3 border-t border-emerald-500/25 pt-3 dark:border-emerald-400/20">
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">No charge</p>
          <p className="mt-1 text-xs text-emerald-900/85 dark:text-emerald-200/90">
            Covered by your included words.
          </p>
        </div>
      )}
    </div>
  )
}

function StandaloneQuoteView({ w, priceInr }: { w: number; priceInr: number | null }) {
  return (
    <>
      <div className="pb-3.5">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Detected words
        </p>
        <p className="mt-1 font-display text-xl font-medium tabular-nums tracking-[-0.02em] text-foreground sm:text-2xl">
          {w > 0 ? w.toLocaleString('en-IN') : '—'}
        </p>
      </div>

      <div
        className="h-px w-full shrink-0 bg-gradient-to-r from-transparent via-border to-transparent"
        aria-hidden
      />

      {priceInr != null ? (
        <div className="flex flex-col gap-2 pt-3.5">
          <div className="relative overflow-hidden rounded-2xl border border-border/90 bg-gradient-to-br from-background via-muted/25 to-brand-500/[0.06] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] dark:from-card dark:via-muted/20 dark:to-brand-500/[0.09] dark:shadow-none">
            <div
              className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-brand-500/10 blur-2xl dark:bg-brand-500/15"
              aria-hidden
            />
            <p className="relative text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Estimated pay-as-you-go
            </p>
            <p className="relative mt-1 text-xs text-muted-foreground">
              Rounded to whole rupees
            </p>
            <p className="relative mt-2 font-display text-3xl font-semibold tabular-nums tracking-[-0.03em] text-foreground sm:text-[2rem]">
              {formatPaygInrDisplay(priceInr, { minFractionDigits: 0, maxFractionDigits: 0 })}
            </p>
          </div>
        </div>
      ) : (
        <p className="pt-3.5 text-sm text-muted-foreground">No words detected in this file.</p>
      )}
    </>
  )
}
