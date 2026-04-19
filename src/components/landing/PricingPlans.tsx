import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'

import { usePricingConfig } from '@/hooks/usePricingConfig'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

/** Whole rupees without a trailing .0; fractional rates up to 2 decimals. */
function formatInr(amount: number): string {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '₹0'
  const isWhole = Math.abs(n - Math.round(n)) < 1e-6
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: isWhole ? 0 : 2,
  }).format(n)
}

export type PricingPlansVariant = 'page' | 'landing'

type PricingPlansProps = {
  variant: PricingPlansVariant
}

export function PricingPlans({ variant }: PricingPlansProps) {
  const isLanding = variant === 'landing'
  const { pricing, isError, refetch } = usePricingConfig({ fetchRemote: !isLanding })
  const user = useAuthStore((s) => s.user)
  const monthlySubscribeTo = user ? '/app/billing' : '/signup?plan=monthly'
  const yearlySubscribeTo = user ? '/app/billing' : '/signup?plan=yearly'
  const wordsPerYear = pricing.subscription_words_per_cycle * 12
  const yearlySaveInr = Math.max(
    0,
    Math.round(pricing.subscription_inr_monthly * 12 - pricing.subscription_inr_yearly),
  )
  const yearlyPerMonthRounded = Math.round(pricing.subscription_inr_yearly / 12)

  const pricingCtaBase = cn(
    'inline-flex min-h-12 w-full max-w-full shrink-0 box-border items-center justify-center rounded-full border border-solid px-8 font-outfit text-base no-underline sm:w-auto sm:min-w-[12rem]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
  )

  const pricingCtaClass = cn(
    pricingCtaBase,
    'font-medium backdrop-blur-sm transition-colors',
    isLanding
      ? cn(
          'border-zinc-200 bg-white text-zinc-800 shadow-sm hover:bg-zinc-50',
          'focus-visible:ring-zinc-400 focus-visible:ring-offset-[#f6f4f1]',
        )
      : cn(
          'border-border bg-background/90 text-foreground hover:bg-muted hover:text-foreground',
          'focus-visible:ring-ring focus-visible:ring-offset-background',
        ),
  )

  const monthlyCtaHighlightClass = cn(
    pricingCtaBase,
    'font-semibold shadow-md transition hover:opacity-95 active:scale-[0.98]',
    isLanding
      ? cn(
          'border-zinc-900 bg-zinc-900 text-white shadow-zinc-900/25 hover:bg-zinc-800',
          'focus-visible:ring-zinc-900/45 focus-visible:ring-offset-[#f6f4f1]',
        )
      : cn(
          'border-primary bg-primary text-primary-foreground shadow-primary/20 hover:opacity-90',
          'focus-visible:ring-ring focus-visible:ring-offset-background',
        ),
  )

  const planCardClass = cn(
    'flex h-full min-h-0 min-w-0 flex-col rounded-2xl p-6 shadow-sm sm:p-8',
    isLanding
      ? 'border border-zinc-200/90 bg-white text-zinc-800 shadow-sm'
      : 'border border-border bg-card text-foreground',
  )

  const checkClass = cn('mt-0.5 size-4 shrink-0', isLanding ? 'text-teal-700' : 'text-primary')

  const pillTagBase =
    'mb-2 inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide shadow-sm'

  const pillCombinedTag = cn(
    pillTagBase,
    isLanding
      ? 'border-teal-700/40 bg-gradient-to-r from-teal-100/95 to-amber-100/90 text-zinc-900'
      : 'border-teal-600/35 bg-gradient-to-r from-teal-100/90 to-amber-100/85 text-zinc-900 dark:from-teal-950/50 dark:to-amber-950/40 dark:text-teal-50 dark:border-teal-500/30',
  )

  const monthlyCardClass = cn(
    'relative flex h-full min-h-0 min-w-0 flex-col rounded-2xl p-6 shadow-md sm:p-8',
    isLanding
      ? 'border-2 border-zinc-900/15 bg-white text-zinc-900 shadow-sm ring-2 ring-zinc-900/8'
      : 'border-2 border-primary bg-primary/5 ring-2 ring-primary/25 dark:bg-primary/10',
  )

  const monthlyPillClass = cn(
    'mb-2 inline-flex w-fit max-w-full flex-wrap items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold',
    isLanding
      ? 'border-zinc-200 bg-zinc-900 text-white'
      : 'border-primary/40 bg-primary text-primary-foreground',
  )

  const yearlyBestValueChipClass = cn(
    'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm',
    isLanding
      ? 'border-white/35 bg-amber-100 text-amber-950'
      : 'border-primary-foreground/30 bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-50 dark:border-amber-400/25',
  )

  const mutedText = isLanding ? 'text-zinc-600' : 'text-muted-foreground'
  const titleStrong = isLanding ? 'text-zinc-900' : 'text-foreground'

  const planBadgeSlotClass = 'min-h-[3.25rem]'
  const planPriceClass = cn(
    'mt-3 flex flex-nowrap items-baseline gap-x-2 font-voltix text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl',
    titleStrong,
  )
  const planPriceSuffixClass = cn('shrink-0 text-sm font-normal tabular-nums', mutedText)
  const planSubheadClass = cn('mt-2 min-h-[2.75rem] text-sm leading-snug', mutedText)

  const errBox = cn(
    'mx-auto mt-6 max-w-2xl rounded-xl border px-4 py-3 text-sm',
    isLanding
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100',
  )

  const content = (
    <>
      <div className="mx-auto max-w-2xl text-center">
        {isLanding ? (
          <>
            <h2
              id="landing-pricing-heading"
              className="font-display text-3xl font-normal tracking-tight text-zinc-900 sm:text-4xl"
            >
              Start free, pay per job, or subscribe.
            </h2>
            <p className={cn('mx-auto mt-3 max-w-lg text-sm leading-relaxed sm:text-base', mutedText)}>
              No card. Try first, pay only if you keep going.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-voltix text-3xl font-semibold tracking-tight sm:text-4xl">
              Start free, pay per job, or subscribe.
            </h1>
            <p className={cn('mx-auto mt-3 max-w-lg text-sm leading-relaxed sm:text-base', mutedText)}>
              No card. Try first, pay only if you keep going.
            </p>
          </>
        )}
      </div>

      {isError ? (
        <div className={errBox} role="alert">
          <p>Can&apos;t load live prices right now—showing defaults.</p>
          <button type="button" className="mt-2 font-semibold underline" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      ) : null}

      <div className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">
        <div className={planCardClass}>
          <div className={planBadgeSlotClass}>
            <p className={pillCombinedTag}>Free &amp; pay-as-you-go</p>
          </div>
          <p className={planPriceClass}>
            <span>₹0</span>
          </p>
          <p className={planSubheadClass}>
            Free credits included, then{' '}
            <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
              {formatInr(pricing.rate_inr_per_10000_words)} / 10k words
            </strong>{' '}
            pay-as-you-go
          </p>
          <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm">
            <li className="flex gap-2">
              <Check className={checkClass} strokeWidth={2.25} aria-hidden />
              <span>
                <strong>{pricing.free_credits_words.toLocaleString('en-IN')}</strong> free words
              </span>
            </li>
            <li className="flex gap-2">
              <Check className={checkClass} strokeWidth={2.25} aria-hidden />
              <span>Credits never expire</span>
            </li>
            <li className="flex gap-2">
              <Check className={checkClass} strokeWidth={2.25} aria-hidden />
              <span>See word count &amp; price before you pay</span>
            </li>
            <li className="flex gap-2">
              <Check className={checkClass} strokeWidth={2.25} aria-hidden />
              <span>
                Upload PDF, DOCX, or text — download a finished{' '}
                <strong className="font-semibold text-inherit">DOCX</strong> or{' '}
                <strong className="font-semibold text-inherit">PDF</strong> in your reading language
              </span>
            </li>
          </ul>
          <div className="mt-auto flex w-full min-w-0 justify-center pt-8">
            <Link to="/signup" className={pricingCtaClass}>
              Start free
            </Link>
          </div>
        </div>

        <div className={monthlyCardClass} aria-labelledby="monthly-plan-badge-label">
          <div className={planBadgeSlotClass}>
            <p id="monthly-plan-badge-label" className={monthlyPillClass}>
              <span className="inline-flex items-center gap-1">
                <span aria-hidden>⭐</span>
                <span className="text-sm font-semibold normal-case tracking-tight">Monthly</span>
              </span>
              <span className={yearlyBestValueChipClass}>Best offer</span>
            </p>
          </div>
          <p className={planPriceClass}>
            <span>{formatInr(pricing.subscription_inr_monthly)}</span>
            <span className={planPriceSuffixClass}>per month</span>
          </p>
          <p className={planSubheadClass}>Fixed monthly · big word pool · priority queue</p>
          <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm">
            <li className="flex gap-2">
              <Check className={checkClass} strokeWidth={2.25} aria-hidden />
              <span>
                <strong>{pricing.subscription_words_per_cycle.toLocaleString('en-IN')}</strong> words/mo · resets each
                cycle
              </span>
            </li>
            <li className="flex gap-2">
              <Check className={checkClass} strokeWidth={2.25} aria-hidden />
              <span>Priority queue</span>
            </li>
            <li className="flex gap-2">
              <Check className={checkClass} strokeWidth={2.25} aria-hidden />
              <span>Quote before each job · free → pool → PAYG</span>
            </li>
            <li className="flex gap-2">
              <Check className={checkClass} strokeWidth={2.25} aria-hidden />
              <span>
                Upload PDF, DOCX, or text — download a{' '}
                <strong className="font-semibold text-inherit">DOCX</strong> or{' '}
                <strong className="font-semibold text-inherit">PDF</strong> in your reading language
              </span>
            </li>
          </ul>
          <div className="mt-auto flex w-full min-w-0 justify-center pt-8">
            <Link to={monthlySubscribeTo} className={monthlyCtaHighlightClass}>
              Subscribe
            </Link>
          </div>
        </div>

        <div className={planCardClass} aria-labelledby="yearly-plan-badge-label">
          <div className={planBadgeSlotClass}>
            <p id="yearly-plan-badge-label" className={monthlyPillClass}>
              <span className="inline-flex items-center gap-1">
                <span className="text-sm font-semibold normal-case tracking-tight">Yearly</span>
              </span>
              {yearlySaveInr > 0 ? (
                <span className={yearlyBestValueChipClass}>Save {formatInr(yearlySaveInr)}</span>
              ) : null}
            </p>
          </div>
          <p className={planPriceClass}>
            <span>{formatInr(pricing.subscription_inr_yearly)}</span>
            <span className={planPriceSuffixClass}>per year</span>
          </p>
          <p className={planSubheadClass}>
            Billed once per year · priority queue · ~{formatInr(yearlyPerMonthRounded)} per month average
          </p>
          <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm">
            {yearlySaveInr > 0 ? (
              <li className="flex gap-2">
                <Check className={checkClass} strokeWidth={2.25} aria-hidden />
                <span>
                  <strong>Save {formatInr(yearlySaveInr)}</strong> vs 12 monthly bills
                </span>
              </li>
            ) : null}
            <li className="flex gap-2">
              <Check className={checkClass} strokeWidth={2.25} aria-hidden />
              <span>
                <strong>{wordsPerYear.toLocaleString('en-IN')}</strong> words/year
              </span>
            </li>
            <li className="flex gap-2">
              <Check className={checkClass} strokeWidth={2.25} aria-hidden />
              <span>Priority queue · full year</span>
            </li>
            <li className="flex gap-2">
              <Check className={checkClass} strokeWidth={2.25} aria-hidden />
              <span>Each job: quote first · free → pool → PAYG</span>
            </li>
            <li className="flex gap-2">
              <Check className={checkClass} strokeWidth={2.25} aria-hidden />
              <span>
                Upload PDF, DOCX, or text — download a{' '}
                <strong className="font-semibold text-inherit">DOCX</strong> or{' '}
                <strong className="font-semibold text-inherit">PDF</strong> in your reading language
              </span>
            </li>
          </ul>
          <div className="mt-auto flex w-full min-w-0 justify-center pt-8">
            <Link to={yearlySubscribeTo} className={pricingCtaClass}>
              Subscribe
            </Link>
          </div>
        </div>
      </div>
    </>
  )

  if (isLanding) {
    return (
      <section
        id="pricing"
        aria-labelledby="landing-pricing-heading"
        className="scroll-mt-28 border-t border-stone-200/90 bg-[#f6f4f1] px-4 py-14 sm:px-6 sm:py-20"
      >
        {content}
      </section>
    )
  }

  return <div className="w-full px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">{content}</div>
}
