import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CalendarRange, Check, Sparkles } from 'lucide-react'

import { usePricingConfig } from '@/hooks/usePricingConfig'
import { refreshProfileExtras } from '@/lib/syncBackendProfile'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useProfileExtrasStore } from '@/stores/profileExtrasStore'

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

/** Split ₹ and digits so the symbol can use a body font and sit on the numeral baseline. */
function inrFormatParts(amount: number): { symbol: string; body: string } {
  const n = Number(amount)
  if (!Number.isFinite(n)) return { symbol: '₹', body: '0' }
  const isWhole = Math.abs(n - Math.round(n)) < 1e-6
  const parts = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: isWhole ? 0 : 2,
  }).formatToParts(n)
  let symbol = '₹'
  const body: string[] = []
  for (const p of parts) {
    if (p.type === 'currency') symbol = p.value
    else body.push(p.value)
  }
  return { symbol, body: body.join('') }
}

function PlanPriceInr({
  amount,
  symbolClassName,
  className,
}: {
  amount: number
  /** e.g. smaller rupee in strike row: `text-[0.9em]` */
  symbolClassName?: string
  className?: string
}) {
  const { symbol, body } = inrFormatParts(amount)
  return (
    <span className={cn('inline-flex items-baseline gap-px', className)} aria-label={formatInr(amount)}>
      <span
        className={cn(
          'shrink-0 translate-y-px font-outfit text-[0.78em] font-semibold leading-none text-inherit',
          symbolClassName,
        )}
        aria-hidden
      >
        {symbol}
      </span>
      <span className="font-voltix tabular-nums tracking-tight text-inherit" aria-hidden>
        {body}
      </span>
    </span>
  )
}

/** Landing marketing display only; checkout still uses live `pricing` from the API. */
const LANDING_PROMO_MONTHLY_LIST_INR = 1999
const LANDING_PROMO_MONTHLY_SALE_INR = 999
const LANDING_PROMO_YEARLY_LIST_INR = 19990
const LANDING_PROMO_YEARLY_SALE_INR = 9990

function InputOutputFormatListItems({
  checkClass,
  rowClassName = 'flex gap-2',
}: {
  checkClass: string
  rowClassName?: string
}) {
  const lineSpan = 'min-w-0 [overflow-wrap:anywhere] break-words'
  return (
    <>
      <li className={rowClassName}>
        <Check className={checkClass} strokeWidth={2.25} aria-hidden />
        <span className={lineSpan}>
          <strong className="font-semibold text-inherit">Input:</strong> PDF, DOCX, or text
        </span>
      </li>
      <li className={rowClassName}>
        <Check className={checkClass} strokeWidth={2.25} aria-hidden />
        <span className={lineSpan}>
          <strong className="font-semibold text-inherit">Output:</strong> Finished{' '}
          <strong className="font-semibold text-inherit">DOCX</strong> or{' '}
          <strong className="font-semibold text-inherit">PDF</strong> in your reading language
        </span>
      </li>
    </>
  )
}

export type PricingPlansVariant = 'page' | 'landing'

type PricingPlansProps = {
  variant: PricingPlansVariant
}

export function PricingPlans({ variant }: PricingPlansProps) {
  const isLanding = variant === 'landing'
  const { pricing, isError, refetch } = usePricingConfig({ fetchRemote: !isLanding })
  const user = useAuthStore((s) => s.user)
  const plan = useProfileExtrasStore((s) => s.plan)
  const subActive = useProfileExtrasStore((s) => s.subscriptionActive)
  const planNorm = (plan || 'free').toLowerCase().trim()
  const isMonthlySub = Boolean(subActive && planNorm === 'monthly')
  const isYearlySub = Boolean(subActive && planNorm === 'yearly')
  const landingUser = isLanding && Boolean(user)
  const disableStartFreeCta = landingUser
  const disableMonthlyCta = landingUser && (isMonthlySub || isYearlySub)
  const disableYearlyCta = landingUser && isYearlySub

  useEffect(() => {
    if (isLanding && user) void refreshProfileExtras()
  }, [isLanding, user?.id])

  const monthlySubscribeTo = user ? '/app/billing?subscribe=monthly' : '/signup'
  const yearlySubscribeTo = user ? '/app/billing?subscribe=yearly' : '/signup'
  const wordsPerYear = pricing.subscription_words_per_cycle * 12
  const yearlySaveInr = Math.max(
    0,
    Math.round(pricing.subscription_inr_monthly * 12 - pricing.subscription_inr_yearly),
  )
  const yearlyPerMonthRounded = Math.round(pricing.subscription_inr_yearly / 12)
  const landingYearlyPerMonthRounded = Math.round(LANDING_PROMO_YEARLY_SALE_INR / 12)

  const pricingCtaBase = cn(
    'inline-flex min-h-12 w-full max-w-full shrink-0 box-border items-center justify-center rounded-full border border-solid px-8 font-outfit text-[0.9375rem] font-medium tracking-wide no-underline',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    isLanding ? 'min-h-[3.25rem] w-full sm:min-w-0' : 'sm:w-auto sm:min-w-[12rem]',
  )

  const pricingCtaClass = cn(
    pricingCtaBase,
    'font-medium backdrop-blur-sm transition-colors',
    isLanding
      ? cn(
          'border-zinc-200/95 bg-white text-zinc-800 shadow-[0_2px_8px_-2px_rgba(24,24,27,0.06)] hover:bg-zinc-50/95',
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
          'border-zinc-900 bg-zinc-900 text-white shadow-[0_8px_24px_-4px_rgba(24,24,27,0.35)] hover:bg-zinc-800',
          'focus-visible:ring-zinc-900/45 focus-visible:ring-offset-[#f6f4f1]',
        )
      : cn(
          'border-primary bg-primary text-primary-foreground shadow-primary/20 hover:opacity-90',
          'focus-visible:ring-ring focus-visible:ring-offset-background',
        ),
  )

  const planCardClass = cn(
    'flex h-full min-h-0 min-w-0 flex-col',
    isLanding ? 'box-border w-full max-w-full p-5 sm:p-7' : 'p-6 sm:p-8',
    isLanding
      ? cn(
          'relative z-0 isolate rounded-3xl border border-zinc-200/80 bg-white/95 text-zinc-800 shadow-sm',
          'shadow-[0_1px_0_0_rgba(0,0,0,0.03),0_14px_36px_-10px_rgba(24,24,27,0.14)]',
          'transition duration-300 ease-out hover:shadow-[0_1px_0_0_rgba(0,0,0,0.04),0_22px_48px_-12px_rgba(24,24,27,0.16)]',
        )
      : cn('rounded-2xl border border-border bg-card text-foreground shadow-sm'),
  )

  const checkClass = cn(
    'shrink-0',
    isLanding ? 'mt-[0.2rem] size-[1.125rem] text-teal-600' : 'mt-0.5 size-4 text-primary',
  )

  const pillTagBase =
    'mb-2 inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide shadow-sm'

  const pillCombinedTag = cn(
    pillTagBase,
    isLanding
      ? 'border-teal-700/40 bg-gradient-to-r from-teal-100/95 to-amber-100/90 font-outfit text-[11px] tracking-[0.12em] text-zinc-900'
      : 'border-teal-600/35 bg-gradient-to-r from-teal-100/90 to-amber-100/85 text-zinc-900 dark:from-teal-950/50 dark:to-amber-950/40 dark:text-teal-50 dark:border-teal-500/30',
  )

  const monthlyCardClass = cn(
    'relative z-0 isolate flex h-full min-h-0 min-w-0 flex-col overflow-hidden',
    isLanding ? 'box-border w-full max-w-full p-5 sm:p-7' : 'p-6 sm:p-8',
    isLanding
      ? cn(
          'rounded-3xl border-2 border-zinc-900/18 bg-white text-zinc-900',
          'shadow-[0_20px_50px_-14px_rgba(24,24,27,0.22)] ring-1 ring-zinc-900/[0.06]',
          'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-[3px] before:bg-gradient-to-r before:from-teal-600 before:via-teal-500 before:to-amber-500',
          'transition duration-300 ease-out hover:shadow-[0_26px_56px_-14px_rgba(24,24,27,0.26)]',
        )
      : cn(
          'rounded-2xl border-2 border-primary bg-primary/5 shadow-md ring-2 ring-primary/25 dark:bg-primary/10',
        ),
  )

  const monthlyPillClass = cn(
    'mb-2 inline-flex w-fit max-w-full flex-wrap items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold',
    isLanding
      ? 'border-zinc-200 bg-zinc-900 font-outfit text-white'
      : 'border-primary/40 bg-primary text-primary-foreground',
  )

  /** Yearly badge: keep off pure black; teal aligns with checkmarks and monthly hero contrast. */
  const yearlyPillClass = cn(
    'mb-2 inline-flex w-fit max-w-full flex-wrap items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold',
    isLanding
      ? 'border-teal-500/40 bg-gradient-to-r from-teal-600 to-emerald-600 font-outfit text-white shadow-sm'
      : 'border-teal-500/50 bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-sm',
  )

  const yearlyBestValueChipClass = cn(
    'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm',
    isLanding
      ? 'border-white/35 bg-amber-100 text-amber-950'
      : 'border-primary-foreground/30 bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-50 dark:border-amber-400/25',
  )

  /** Landing promo row only — stronger than other chips. */
  const landingFiftyOffChipClass = cn(
    'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider shadow-md',
    'border-amber-600/50 bg-gradient-to-r from-amber-200 via-amber-50 to-orange-100 text-amber-950',
    'ring-2 ring-inset ring-amber-500/35 ring-offset-0',
  )

  /**
   * Struck-through list price — use `inline-block` (not flex) so line-through paints over text reliably;
   * nested `inline-flex` + line-through can hide numerals in some browsers.
   */
  const landingPromoCancelledListPriceClass = cn(
    'inline-block align-baseline font-normal line-through decoration-2 decoration-zinc-500',
    '[text-decoration-skip-ink:none]',
  )

  const mutedText = isLanding ? 'text-zinc-600' : 'text-muted-foreground'
  const titleStrong = isLanding ? 'text-zinc-900' : 'text-foreground'

  const planBadgeSlotClass = isLanding ? 'min-h-[3rem] sm:min-h-[3.125rem]' : 'min-h-[3.25rem]'
  /** Landing: `flex-nowrap` + 3-up grid makes price + “per month” wider than the column → right edge clipped under #root overflow-x: clip. */
  const planPriceAmountClass = cn(
    'flex items-baseline font-voltix font-semibold tabular-nums tracking-[-0.02em]',
    isLanding
      ? 'min-w-0 flex-wrap gap-x-2.5 gap-y-1 text-3xl sm:text-[2.35rem] sm:leading-none'
      : 'flex-nowrap gap-x-2 text-2xl sm:text-3xl',
    titleStrong,
  )
  const planPriceClass = cn('mt-3', planPriceAmountClass)
  const planPriceSuffixClass = cn(
    'shrink-0 tabular-nums',
    isLanding
      ? 'translate-y-px pb-0.5 font-outfit text-xs font-medium uppercase tracking-[0.14em] text-zinc-500'
      : cn('text-sm font-normal', mutedText),
  )
  const planSubheadClass = cn(
    'min-h-[2.5rem] sm:min-h-[2.75rem]',
    isLanding
      ? 'mt-2.5 font-outfit text-[0.8125rem] leading-[1.5] text-zinc-500 sm:mt-3 sm:text-sm sm:leading-[1.55]'
      : cn('mt-2 text-sm leading-snug', mutedText),
  )

  /** Same vertical space as promo + main price on Monthly/Yearly so checkmark lists line up. */
  const landingPriceBlockClass = cn(
    'mt-3 flex min-h-[4.5rem] flex-col sm:mt-3.5 sm:min-h-[4.35rem]',
  )

  const featureItemClass = cn(
    'flex min-w-0',
    isLanding ? 'items-start gap-3 [&>span]:min-w-0' : 'items-center gap-2',
  )

  const featureListClass = cn(
    'flex flex-1 flex-col',
    isLanding
      ? cn(
          'mt-5 gap-3 border-t border-zinc-100 pt-4 font-outfit text-[0.9375rem] leading-[1.5] text-zinc-600 sm:mt-6 sm:gap-3.5 sm:pt-5 sm:leading-[1.55]',
          '[&_strong]:font-semibold [&_strong]:text-zinc-900',
          /* Mobile: long bullet lines must wrap so card — border stays inside #root overflow-x clip. */
          '[&>li>span]:min-w-0 [&>li>span]:break-words [&>li>span]:[overflow-wrap:anywhere]',
        )
      : 'mt-5 gap-2.5 text-sm',
  )

  const landingPromoPriceRowClass = cn(
    'flex flex-wrap items-baseline gap-x-2.5 gap-y-1 font-outfit text-sm font-normal text-zinc-500',
  )

  const errBox = cn(
    'mx-auto mt-6 max-w-2xl rounded-xl border px-4 py-3 text-sm',
    isLanding
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100',
  )

  const ctaDisabledClass = 'pointer-events-none cursor-not-allowed opacity-50'

  const content = (
    <>
      <div className="mx-auto max-w-2xl text-center">
        {isLanding ? (
          <>
            <p className="mb-2.5 font-outfit text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500 sm:mb-3 sm:text-[11px]">
              Pricing
            </p>
            <h2
              id="landing-pricing-heading"
              className="font-display text-[1.75rem] font-normal leading-[1.12] tracking-[-0.03em] text-zinc-900 sm:text-[2.375rem] sm:leading-[1.08] sm:tracking-[-0.035em]"
            >
              Start free, pay per job, or subscribe.
            </h2>
            <p
              className={cn(
                'mx-auto mt-3 max-w-md font-outfit text-pretty text-sm font-normal leading-[1.6] text-zinc-600 sm:mt-4 sm:max-w-lg sm:text-base',
              )}
            >
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

      <div
        className={
          isLanding
            ? 'mx-auto mt-10 grid min-w-0 w-full max-w-6xl grid-cols-1 content-start items-stretch gap-8 sm:mt-12 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-0'
            : 'mx-auto mt-10 grid min-w-0 w-full max-w-6xl grid-cols-1 gap-y-7 sm:mt-11 sm:gap-y-8 lg:grid-cols-3 lg:items-stretch lg:gap-6'
        }
      >
        <div className={planCardClass}>
          <div className={planBadgeSlotClass}>
            <p className={pillCombinedTag}>Free &amp; pay-as-you-go</p>
          </div>
          {isLanding ? (
            <div className={cn(landingPriceBlockClass, 'justify-end')}>
              <p className={planPriceAmountClass}>
                <PlanPriceInr amount={0} />
              </p>
            </div>
          ) : (
            <p className={planPriceClass}>
              <PlanPriceInr amount={0} />
            </p>
          )}
          <p className={planSubheadClass}>
            Free credits included,
            <br />
            Then{' '}
            <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
              {formatInr(pricing.rate_inr_per_10000_words)} / 10k words
            </strong>{' '}
            pay-as-you-go
          </p>
          <ul className={featureListClass}>
            <li className={featureItemClass}>
              <Check className={checkClass} strokeWidth={2.25} aria-hidden />
              <span>
                <strong>{pricing.free_credits_words.toLocaleString('en-IN')}</strong> free words
              </span>
            </li>
            <li className={featureItemClass}>
              <Check className={checkClass} strokeWidth={2.25} aria-hidden />
              <span>Credits never expire</span>
            </li>
            <li className={featureItemClass}>
              <Check className={checkClass} strokeWidth={2.25} aria-hidden />
              <span>
                <strong>1</strong> time correction / document
              </span>
            </li>
            <li className={featureItemClass}>
              <Check className={checkClass} strokeWidth={2.25} aria-hidden />
              <span>See word count &amp; price before you pay</span>
            </li>
            <InputOutputFormatListItems checkClass={checkClass} rowClassName={featureItemClass} />
          </ul>
          <div className={cn('mt-auto flex w-full min-w-0', isLanding ? 'pt-5 sm:pt-6' : 'pt-6 justify-center')}>
            {disableStartFreeCta ? (
              <span
                className={cn(pricingCtaClass, ctaDisabledClass)}
                aria-disabled="true"
                title="You’re already using the app — choose a subscription below to upgrade."
              >
                Start Free
              </span>
            ) : (
              <Link to="/signup" className={pricingCtaClass}>
                Start Free
              </Link>
            )}
          </div>
        </div>

        <div className={monthlyCardClass} aria-labelledby="monthly-plan-badge-label">
          <div className={planBadgeSlotClass}>
            <p id="monthly-plan-badge-label" className={monthlyPillClass}>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="size-3.5 shrink-0 opacity-90" strokeWidth={2.25} aria-hidden />
                <span className="text-sm font-semibold normal-case tracking-tight">Monthly</span>
              </span>
              <span className={yearlyBestValueChipClass}>Best offer</span>
            </p>
          </div>
          {isLanding ? (
            <div className={cn(landingPriceBlockClass, 'gap-2')}>
              <p className={landingPromoPriceRowClass}>
                <span className={landingFiftyOffChipClass}>50% off</span>
                <span className={landingPromoCancelledListPriceClass}>
                  <PlanPriceInr
                    amount={LANDING_PROMO_MONTHLY_LIST_INR}
                    className="text-zinc-500"
                    symbolClassName="text-[0.9em] font-normal"
                  />
                </span>
              </p>
              <p className={planPriceAmountClass}>
                <PlanPriceInr amount={LANDING_PROMO_MONTHLY_SALE_INR} />
                <span className={planPriceSuffixClass}>per month</span>
              </p>
            </div>
          ) : (
            <p className={planPriceClass}>
              <PlanPriceInr amount={pricing.subscription_inr_monthly} />
              <span className={planPriceSuffixClass}>per month</span>
            </p>
          )}
          <p className={planSubheadClass}>
            Fixed monthly · Big words pool
          </p>
          <ul className={featureListClass}>
            <li className={featureItemClass}>
              <Check className={checkClass} strokeWidth={2.25} aria-hidden />
              <span>
                <strong>{pricing.subscription_words_per_cycle.toLocaleString('en-IN')}</strong> words/month
              </span>
            </li>
            <li className={featureItemClass}>
              <Check className={checkClass} strokeWidth={2.25} aria-hidden />
              <span>Resets each cycle</span>
            </li>
            <li className={featureItemClass}>
              <Check className={checkClass} strokeWidth={2.25} aria-hidden />
              <span>Priority queue</span>
            </li>
            <li className={featureItemClass}>
              <Check className={checkClass} strokeWidth={2.25} aria-hidden />
              <span>
                <strong>2</strong> times correction / document
              </span>
            </li>
            <InputOutputFormatListItems checkClass={checkClass} rowClassName={featureItemClass} />
          </ul>
          <div className={cn('mt-auto flex w-full min-w-0', isLanding ? 'pt-5 sm:pt-6' : 'pt-6 justify-center')}>
            {disableMonthlyCta ? (
              <span
                className={cn(monthlyCtaHighlightClass, ctaDisabledClass)}
                aria-disabled="true"
                title={
                  isYearlySub
                    ? 'You already have a yearly subscription.'
                    : 'You’re already on the monthly plan.'
                }
              >
                Subscribe
              </span>
            ) : (
              <Link to={monthlySubscribeTo} className={monthlyCtaHighlightClass}>
                Subscribe
              </Link>
            )}
          </div>
        </div>

        <div className={planCardClass} aria-labelledby="yearly-plan-badge-label">
          <div className={planBadgeSlotClass}>
            <p id="yearly-plan-badge-label" className={yearlyPillClass}>
              <span className="inline-flex items-center gap-1.5">
                <CalendarRange className="size-3.5 shrink-0 opacity-90" strokeWidth={2.25} aria-hidden />
                <span className="text-sm font-semibold normal-case tracking-tight">Yearly</span>
              </span>
              {isLanding ? (
                <span className={yearlyBestValueChipClass}>Billed annually</span>
              ) : yearlySaveInr > 0 ? (
                <span className={yearlyBestValueChipClass}>Save {formatInr(yearlySaveInr)}</span>
              ) : null}
            </p>
          </div>
          {isLanding ? (
            <div className={cn(landingPriceBlockClass, 'gap-2')}>
              <p className={landingPromoPriceRowClass}>
                <span className={landingFiftyOffChipClass}>50% off</span>
                <span className={landingPromoCancelledListPriceClass}>
                  <PlanPriceInr
                    amount={LANDING_PROMO_YEARLY_LIST_INR}
                    className="text-zinc-500"
                    symbolClassName="text-[0.9em] font-normal"
                  />
                </span>
              </p>
              <p className={planPriceAmountClass}>
                <PlanPriceInr amount={LANDING_PROMO_YEARLY_SALE_INR} />
                <span className={planPriceSuffixClass}>per year</span>
              </p>
            </div>
          ) : (
            <p className={planPriceClass}>
              <PlanPriceInr amount={pricing.subscription_inr_yearly} />
              <span className={planPriceSuffixClass}>per year</span>
            </p>
          )}
          <p className={planSubheadClass}>
            Billed once per year
            <br />
            {formatInr(isLanding ? landingYearlyPerMonthRounded : yearlyPerMonthRounded)} per month average
          </p>
          <ul className={featureListClass}>
            <li className={featureItemClass}>
              <Check className={checkClass} strokeWidth={2.25} aria-hidden />
              <span>
                <strong>{wordsPerYear.toLocaleString('en-IN')}</strong> words for the full year
              </span>
            </li>
            <li className={featureItemClass}>
              <Check className={checkClass} strokeWidth={2.25} aria-hidden />
              <span>
                Up to <strong>{pricing.subscription_words_per_cycle.toLocaleString('en-IN')}</strong> words to use
                each month
              </span>
            </li>
            <li className={featureItemClass}>
              <Check className={checkClass} strokeWidth={2.25} aria-hidden />
              <span>Your monthly words reset every month</span>
            </li>
            <li className={featureItemClass}>
              <Check className={checkClass} strokeWidth={2.25} aria-hidden />
              <span>
                <strong>3</strong> times correction / document
              </span>
            </li>
            <InputOutputFormatListItems checkClass={checkClass} rowClassName={featureItemClass} />
          </ul>
          <div className={cn('mt-auto flex w-full min-w-0', isLanding ? 'pt-5 sm:pt-6' : 'pt-6 justify-center')}>
            {disableYearlyCta ? (
              <span
                className={cn(pricingCtaClass, ctaDisabledClass)}
                aria-disabled="true"
                title="You already have a yearly subscription."
              >
                Subscribe
              </span>
            ) : (
              <Link to={yearlySubscribeTo} className={pricingCtaClass}>
                Subscribe
              </Link>
            )}
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
        className={cn(
          'w-full min-w-0 max-w-full scroll-mt-28 border-t border-stone-200/80 py-14 sm:py-20',
          /* Gutter comes from `LandingPage` below-fold `px-4 tab:px-6` — do not add second px here or the right side clips on mobile. */
          'px-0',
          'bg-[linear-gradient(180deg,#f6f4f1_0%,#f1ece6_55%,#f6f4f1_100%)]',
        )}
      >
        <div className="mx-auto w-full min-w-0 max-w-full box-border">{content}</div>
      </section>
    )
  }

  return <div className="w-full px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">{content}</div>
}
