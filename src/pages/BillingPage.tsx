import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Gift,
  HelpCircle,
  Loader2,
  Sparkles,
  Upload,
} from 'lucide-react'
import toast from 'react-hot-toast'

import {
  createRazorpaySubscription,
  syncRazorpaySubscriptionAfterCheckout,
} from '@/api/billing'
import { usePricingConfig } from '@/hooks/usePricingConfig'
import { loadRazorpayScript } from '@/lib/razorpayScript'
import { refreshProfileExtras } from '@/lib/syncBackendProfile'
import { appPageHeaderClass, appPageShellClass, appPageTitleClass } from '@/lib/appPageLayout'
import { cn } from '@/lib/utils'
import { formatDate } from '@/utils/format'
import { useProfileExtrasStore } from '@/stores/profileExtrasStore'

function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function BillingPage() {
  const { pricing } = usePricingConfig()
  const [searchParams, setSearchParams] = useSearchParams()
  const freeCredits = useProfileExtrasStore((s) => s.freeCredits)
  const referralBonus = useProfileExtrasStore((s) => s.referralBonusWords)
  const subActive = useProfileExtrasStore((s) => s.subscriptionActive)
  const planSlug = useProfileExtrasStore((s) => s.plan)
  const subCredits = useProfileExtrasStore((s) => s.subscriptionCredits)
  const subExpiry = useProfileExtrasStore((s) => s.subscriptionExpiry)

  const [subBusy, setSubBusy] = useState(false)

  const startSubscription = useCallback(
    async (plan: 'monthly' | 'yearly') => {
      setSubBusy(true)
      try {
        await loadRazorpayScript()
        const start = await createRazorpaySubscription(plan)
        const Ctor = window.Razorpay
        if (!Ctor) {
          throw new Error('Razorpay SDK missing after load.')
        }
        const isYear = plan === 'yearly'
        const desc = isYear
          ? `Yearly · ${formatInr(pricing.subscription_inr_yearly)}`
          : `Monthly · ${formatInr(pricing.subscription_inr_monthly)}`
        const rzp = new Ctor({
          key: start.key_id,
          subscription_id: start.subscription_id,
          name: 'Porpin',
          description: desc,
          async handler() {
            try {
              await syncRazorpaySubscriptionAfterCheckout()
            } catch {
              toast.error(
                'Payment succeeded but account sync failed. Wait a minute, refresh the page, or contact support.',
                { duration: 8000 },
              )
            }
            await refreshProfileExtras()
            toast.success('Subscription activated. Credits refresh shortly.')
          },
          modal: {
            ondismiss() {
              void refreshProfileExtras()
            },
          },
        })
        rzp.open()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not start checkout.')
      } finally {
        setSubBusy(false)
      }
    },
    [pricing.subscription_inr_monthly, pricing.subscription_inr_yearly],
  )

  useEffect(() => {
    const raw = searchParams.get('subscribe')
    const fromLanding = raw === 'monthly' || raw === 'yearly'
    let cancelled = false
    void (async () => {
      await refreshProfileExtras()
      if (cancelled) return
      if (!fromLanding || !raw) return
      const stripQuery = () =>
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev)
            next.delete('subscribe')
            return next
          },
          { replace: true },
        )
      if (useProfileExtrasStore.getState().subscriptionActive) {
        stripQuery()
        return
      }
      stripQuery()
      if (cancelled) return
      void startSubscription(raw)
    })()
    return () => {
      cancelled = true
    }
  }, [searchParams, setSearchParams, startSubscription])

  const effFreePool = freeCredits + referralBonus
  const subWordsPerCycle = pricing.subscription_words_per_cycle.toLocaleString('en-IN')
  const isMonthlySub = planSlug === 'monthly'
  const isYearlySub = planSlug === 'yearly'
  const monthlySubscribeDisabled =
    subBusy || (subActive && isMonthlySub) || (subActive && isYearlySub)
  const yearlySubscribeDisabled = subBusy || (subActive && isYearlySub)

  return (
    <div
      className={cn(
        appPageShellClass,
        'w-full min-w-0 max-w-full space-y-8 sm:space-y-10 md:space-y-12',
        'px-px',
      )}
    >
      <header className={appPageHeaderClass}>
        <h1 className={appPageTitleClass}>Billing</h1>
      </header>

      {/* How it works */}
      <section
        aria-labelledby="how-heading"
        className={cn(
          'box-border w-full min-w-0 max-w-full overflow-x-hidden rounded-2xl border border-zinc-200/90',
          'bg-zinc-50/90 p-5 sm:p-6',
          'dark:border-zinc-700/90 dark:bg-zinc-900/40',
        )}
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="size-5 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />
          <h2
            id="how-heading"
            className="font-display text-base font-normal tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-lg"
          >
            How billing works
          </h2>
        </div>
        <ol className="mt-5 space-y-4">
          <li className="flex gap-4">
            <span
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                'bg-white text-brand-700 shadow-sm ring-1 ring-zinc-200/80',
                'dark:bg-zinc-950 dark:text-brand-300 dark:ring-zinc-700',
              )}
              aria-hidden
            >
              1
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
                <Gift className="size-4 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />
                Free & referral words
              </p>
              <p className="mt-1 min-w-0 break-words text-sm leading-relaxed text-zinc-600 [overflow-wrap:anywhere] dark:text-zinc-400">
                Used first on every translation. No card required.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <span
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                'bg-white text-brand-700 shadow-sm ring-1 ring-zinc-200/80',
                'dark:bg-zinc-950 dark:text-brand-300 dark:ring-zinc-700',
              )}
              aria-hidden
            >
              2
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
                <Sparkles className="size-4 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />
                Monthly subscription (optional)
              </p>
              <p className="mt-1 min-w-0 break-words text-sm leading-relaxed text-zinc-600 [overflow-wrap:anywhere] dark:text-zinc-400">
                Adds a large word pool each billing cycle. Subscribe below if you want this tier.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <span
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                'bg-white text-brand-700 shadow-sm ring-1 ring-zinc-200/80',
                'dark:bg-zinc-950 dark:text-brand-300 dark:ring-zinc-700',
              )}
              aria-hidden
            >
              3
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
                <Upload className="size-4 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />
                Pay-as-you-go
              </p>
              <p className="mt-1 min-w-0 break-words text-sm leading-relaxed text-zinc-600 [overflow-wrap:anywhere] dark:text-zinc-400">
                After included words run out, you pay per job when you confirm the estimate on Home — not from this page.
              </p>
            </div>
          </li>
        </ol>
      </section>

      {/* Balances */}
      <section aria-labelledby="balances-heading" className="min-w-0 max-w-full">
        <h2
          id="balances-heading"
          className="min-w-0 break-words font-display text-lg font-normal tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          Your word balance
        </h2>
        <p className="mt-1 min-w-0 break-words text-sm text-zinc-600 [overflow-wrap:anywhere] dark:text-zinc-400">
          Pools that apply before pay-as-you-go. Server totals are authoritative if something looks off — refresh or
          sign in again.
        </p>
        <div className="mt-4 grid min-w-0 max-w-full gap-4 sm:grid-cols-2">
          <div
            className={cn(
              'box-border min-w-0 max-w-full overflow-x-hidden rounded-2xl border border-zinc-200/95',
              'bg-white p-5',
              'dark:border-zinc-700/80 dark:bg-zinc-950/80',
            )}
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              <Gift className="size-3.5 text-brand-600 dark:text-brand-400" aria-hidden />
              Free + referral
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
              {effFreePool.toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">words available</p>
            {referralBonus > 0 ? (
              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                Includes {referralBonus.toLocaleString('en-IN')} words from referrals.
              </p>
            ) : (
              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                Base free tier: {pricing.free_credits_words.toLocaleString('en-IN')} words (see pricing on the site).
              </p>
            )}
          </div>
          <div
            className={cn(
              'box-border min-w-0 max-w-full overflow-x-hidden rounded-2xl border border-zinc-200/95',
              'bg-white p-5',
              'dark:border-zinc-700/80 dark:bg-zinc-950/80',
            )}
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              <CalendarDays className="size-3.5 text-brand-600 dark:text-brand-400" aria-hidden />
              Subscription
            </div>
            {subActive ? (
              <>
                <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
                  {subCredits.toLocaleString('en-IN')}
                </p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">words this cycle</p>
                {subExpiry ? (
                  <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                    Renews or ends{' '}
                    <time className="font-medium text-zinc-700 dark:text-zinc-300" dateTime={subExpiry}>
                      {formatDate(subExpiry, 'en-IN')}
                    </time>
                    .
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <p className="mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Not subscribed</p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Add a monthly pool below, or stay on free + pay-as-you-go.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Subscription CTA */}
      <section
        aria-labelledby="sub-heading"
        className={cn(
          'box-border w-full min-w-0 max-w-full overflow-x-hidden rounded-2xl border border-brand-300/80',
          'bg-brand-50/70 p-4 sm:p-6',
          'dark:border-brand-500/45 dark:bg-brand-950/30',
        )}
      >
        <h2
          id="sub-heading"
          className="min-w-0 break-words font-display text-lg font-normal tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          Subscription plans
        </h2>
        <p className="mt-2 min-w-0 break-words text-sm text-zinc-600 [overflow-wrap:anywhere] dark:text-zinc-400">
          <strong>{subWordsPerCycle}</strong> words per cycle on both tiers (yearly = one payment per 12 months, pool
          resets every 30 days in-app).
        </p>
        <ul className="mt-3 min-w-0 max-w-full space-y-2 break-words text-sm text-zinc-700 [overflow-wrap:anywhere] dark:text-zinc-300">
          <li className="flex min-w-0 gap-2">
            <span className="shrink-0 text-brand-600 dark:text-brand-400" aria-hidden>
              ·
            </span>
            <span className="min-w-0">
              <strong>Monthly</strong> — {formatInr(pricing.subscription_inr_monthly)} / month
            </span>
          </li>
          <li className="flex min-w-0 gap-2">
            <span className="shrink-0 text-brand-600 dark:text-brand-400" aria-hidden>
              ·
            </span>
            <span className="min-w-0">
              <strong>Yearly</strong> — {formatInr(pricing.subscription_inr_yearly)} / year
            </span>
          </li>
        </ul>
        <div
          className={cn(
            'mt-5 grid w-full min-w-0 max-w-full grid-cols-1 justify-center gap-2.5',
            'sm:mx-auto sm:max-w-md sm:grid-cols-2 sm:gap-3',
          )}
        >
          <button
            type="button"
            disabled={monthlySubscribeDisabled}
            onClick={() => void startSubscription('monthly')}
            className={cn(
              'inline-flex h-10 w-full min-w-0 max-w-full shrink-0 items-center justify-center gap-2 rounded-lg border-0 px-5',
              'text-sm font-semibold text-white',
              'bg-emerald-600 shadow-md shadow-black/10',
              'transition hover:bg-emerald-700 hover:shadow-lg hover:shadow-black/15 active:scale-[0.98]',
              'dark:bg-emerald-500 dark:hover:bg-emerald-400',
              'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50',
              'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60',
              'touch-manipulation',
            )}
          >
            {subBusy ? (
              <>
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                <span>Opening…</span>
              </>
            ) : (
              <>
                <Calendar className="size-4 shrink-0 opacity-90" aria-hidden />
                Subscribe Monthly
              </>
            )}
          </button>
          <button
            type="button"
            disabled={yearlySubscribeDisabled}
            onClick={() => void startSubscription('yearly')}
            className={cn(
              'inline-flex h-10 w-full min-w-0 max-w-full shrink-0 items-center justify-center gap-2 rounded-lg border-0 px-5',
              'text-sm font-semibold text-white',
              'bg-brand-600 shadow-md shadow-black/10',
              'transition hover:bg-brand-700 hover:shadow-lg hover:shadow-black/15 active:scale-[0.98]',
              'dark:bg-brand-600 dark:hover:bg-brand-500',
              'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50',
              'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60',
              'touch-manipulation',
            )}
          >
            {subBusy ? (
              <>
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                <span>Opening…</span>
              </>
            ) : (
              <>
                <CalendarRange className="size-4 shrink-0 opacity-90" aria-hidden />
                Subscribe Yearly
              </>
            )}
          </button>
        </div>
      </section>

      <p className="text-center text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">
        Any help:{' '}
        <a
          href="mailto:help@porpin.com"
          className="font-medium text-zinc-700 underline decoration-zinc-400/80 underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
        >
          help@porpin.com
        </a>
        {' '}
        · We usually reply within an hour.
      </p>
    </div>
  )
}
