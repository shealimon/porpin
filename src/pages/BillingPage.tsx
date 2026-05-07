import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarDays, Gift, Loader2, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

import {
  createRazorpaySubscription,
  createRazorpayYearlyOrder,
  syncRazorpaySubscriptionAfterCheckout,
  verifyRazorpayYearlyPayment,
} from '@/api/billing'
import { usePricingConfig } from '@/hooks/usePricingConfig'
import { loadRazorpayScript } from '@/lib/razorpayScript'
import { refreshProfileExtras } from '@/lib/syncBackendProfile'
import { appPageHeaderClass, appPageShellClass, appPageTitleClass } from '@/lib/appPageLayout'
import { authFormPrimaryButtonLightClass } from '@/lib/authFormStyles'
import { cn } from '@/lib/utils'
import { formatDate } from '@/utils/format'
import { useProfileExtrasStore } from '@/stores/profileExtrasStore'
import type { RazorpayHandlerResponse } from '@/types/razorpay-checkout'

function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(amount)
}

/** Server `profiles.plan` + subscription flag → billing display tier. */
function getAccountPlanKind(
  planSlug: string,
  subscriptionActive: boolean,
): 'free' | 'payg' | 'monthly' | 'yearly' {
  const p = planSlug.toLowerCase().trim()
  if (subscriptionActive && p === 'yearly') return 'yearly'
  if (subscriptionActive && p === 'monthly') return 'monthly'
  if (p === 'payg') return 'payg'
  return 'free'
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

  const [busyPlan, setBusyPlan] = useState<'monthly' | 'yearly' | null>(null)
  const [upgradeCycle, setUpgradeCycle] = useState<'monthly' | 'yearly'>('monthly')

  const startSubscription = useCallback(
    async (plan: 'monthly' | 'yearly') => {
      setBusyPlan(plan)
      try {
        await loadRazorpayScript()
        const Ctor = window.Razorpay
        if (!Ctor) {
          throw new Error('Razorpay SDK missing after load.')
        }

        if (plan === 'yearly') {
          // Yearly uses a one-time order checkout so UPI QR scan works reliably.
          const order = await createRazorpayYearlyOrder()
          const rzp = new Ctor({
            key: order.key_id,
            order_id: order.order_id,
            amount: order.amount_paise,
            currency: order.currency,
            name: 'Porpin',
            description: `Yearly · ${formatInr(pricing.subscription_inr_yearly)}`,
            handler: async (response: RazorpayHandlerResponse) => {
              const orderId = response.razorpay_order_id
              const payId = response.razorpay_payment_id
              const sig = response.razorpay_signature
              if (!orderId || !payId || !sig) {
                toast.error('Invalid payment response from gateway.')
                return
              }
              try {
                await verifyRazorpayYearlyPayment({
                  razorpay_order_id: orderId,
                  razorpay_payment_id: payId,
                  razorpay_signature: sig,
                })
                await refreshProfileExtras()
                toast.success('Yearly plan activated. Credits refresh shortly.')
              } catch (e) {
                toast.error(
                  e instanceof Error
                    ? e.message
                    : 'Payment succeeded but verification failed. Contact support with your payment id.',
                  { duration: 8000 },
                )
              }
            },
            modal: {
              ondismiss() {
                void refreshProfileExtras()
              },
            },
          })
          rzp.open()
          return
        }

        // Monthly stays on Razorpay subscriptions (recurring).
        const start = await createRazorpaySubscription(plan)
        const desc = `Monthly · ${formatInr(pricing.subscription_inr_monthly)}`
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
        setBusyPlan(null)
      }
    },
    [pricing.subscription_inr_monthly, pricing.subscription_inr_yearly],
  )

  const isMonthlySub = planSlug === 'monthly'
  const isYearlySub = planSlug === 'yearly'
  const busyAny = busyPlan !== null
  const monthlySubscribeDisabled =
    busyAny || (subActive && isMonthlySub) || (subActive && isYearlySub)
  const yearlySubscribeDisabled = busyAny || (subActive && isYearlySub)

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

  useEffect(() => {
    const raw = searchParams.get('subscribe')
    if (raw === 'monthly' || raw === 'yearly') {
      setUpgradeCycle(raw)
    }
  }, [searchParams])

  useEffect(() => {
    if (monthlySubscribeDisabled && !yearlySubscribeDisabled) {
      setUpgradeCycle('yearly')
    } else if (!monthlySubscribeDisabled && yearlySubscribeDisabled) {
      setUpgradeCycle('monthly')
    }
  }, [monthlySubscribeDisabled, yearlySubscribeDisabled])

  const effFreePool = freeCredits + referralBonus
  const subWordsPerCycleFmt = pricing.subscription_words_per_cycle.toLocaleString('en-IN')
  const getSubscribeDisabled =
    upgradeCycle === 'monthly' ? monthlySubscribeDisabled : yearlySubscribeDisabled

  const planKind = getAccountPlanKind(planSlug, subActive)
  const accountPlanTitle =
    planKind === 'yearly'
      ? 'Yearly'
      : planKind === 'monthly'
        ? 'Monthly'
        : planKind === 'payg'
          ? 'Account Plan'
          : 'Free'

  const yearlySaveVsMonthly = Math.round(
    pricing.subscription_inr_monthly * 12 - pricing.subscription_inr_yearly,
  )
  const yearlyPerMonthRounded = Math.round(pricing.subscription_inr_yearly / 12)

  const subscriptionPlanCardClass =
    'min-w-0 rounded-xl border px-2.5 py-2.5 text-left [overflow-wrap:anywhere] transition-colors sm:px-4 sm:py-4'
  const subscriptionPlanSelected =
    'border-zinc-400 bg-zinc-50 dark:border-zinc-500 dark:bg-zinc-900/45'
  const subscriptionPlanUnselected =
    'border-zinc-200/95 bg-white hover:bg-zinc-50/70 dark:border-zinc-700/80 dark:bg-zinc-950/60 dark:hover:bg-zinc-900/50'

  /** Account / Free / Upgrade outer cards — lifts sections off canvas. */
  const billingHighlightCardClass = cn(
    'box-border min-w-0 max-w-full rounded-2xl border border-zinc-200/95',
    'shadow-lg shadow-zinc-900/10',
    'bg-white p-3 sm:p-5',
    'dark:border-zinc-700/80 dark:bg-zinc-950/80 dark:shadow-xl dark:shadow-black/35',
  )

  return (
    <div
      className={cn(
        appPageShellClass,
        /** `max-w-full` wins over shell `max-w-3xl` — stay within scroll pane so parent `overflow:hidden` does not clip. */
        'box-border min-w-0 max-w-full space-y-7 sm:space-y-10 md:space-y-12',
        'touch-manipulation [-webkit-tap-highlight-color:transparent]',
        '[overflow-wrap:anywhere]',
      )}
    >
      <header className={appPageHeaderClass}>
        <h1 className={appPageTitleClass}>Billing</h1>
      </header>

      {/* Account plan */}
      <section aria-labelledby="account-plan-heading" className="min-w-0 max-w-full">
        <h2 id="account-plan-heading" className="sr-only">
          Account Plan
        </h2>
        <div className={billingHighlightCardClass}>
          <div className="flex items-start gap-2.5 sm:gap-4">
            <CalendarDays className="mt-0.5 size-9 shrink-0 text-brand-600 dark:text-brand-400 sm:size-10" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-display text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-[1.625rem]">
                {accountPlanTitle}
              </p>
              {planKind === 'payg' ? (
                <p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl [overflow-wrap:anywhere]">
                  Pay per job
                </p>
              ) : null}
              {planKind === 'free' && !subActive ? (
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Referrals apply first—upgrade below or pay per job.
                </p>
              ) : null}
              {(planKind === 'monthly' || planKind === 'yearly') && subActive ? (
                <>
                  <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl [overflow-wrap:anywhere]">
                    {subCredits.toLocaleString('en-IN')}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">plan words · this cycle</p>
                  {subExpiry ? (
                    <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                      Next:{' '}
                      <time className="font-medium text-zinc-700 dark:text-zinc-300" dateTime={subExpiry}>
                        {formatDate(subExpiry, 'en-IN')}
                      </time>
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Free + referral words */}
      <section aria-labelledby="free-words-heading" className="min-w-0 max-w-full">
        <h2 id="free-words-heading" className="sr-only">
          Free + Referral Words
        </h2>
        <div className={billingHighlightCardClass}>
          <div className="flex items-start gap-2.5 sm:gap-4">
            <Gift className="mt-0.5 size-9 shrink-0 text-brand-600 dark:text-brand-400 sm:size-10" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-display text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-[1.625rem]">
                Free + Referral Words
              </p>
              <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl [overflow-wrap:anywhere]">
                {effFreePool.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Upgrade */}
      <section aria-labelledby="upgrade-heading" className="min-w-0 max-w-full">
        <h2 id="upgrade-heading" className="sr-only">
          Upgrade
        </h2>
        <div className={billingHighlightCardClass}>
          <div className="flex items-start gap-2.5 sm:gap-4">
            <Sparkles className="mt-0.5 size-9 shrink-0 text-brand-600 dark:text-brand-400 sm:size-10" aria-hidden />
            <p className="min-w-0 font-display text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-[1.625rem]">
              Upgrade
            </p>
          </div>
          <fieldset
            className={cn(
              /** One column on narrow phones: avoids clipping under shell `overflow:hidden`. Two columns from `sm` up. */
              'm-0 mt-4 grid w-full min-w-0 grid-cols-1 gap-3 border-0 p-0',
              'sm:mt-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-4',
            )}
          >
            <legend className="sr-only">Billing period</legend>
                <label
                  htmlFor="billing-upgrade-monthly"
                  className={cn(
                    'flex h-full min-w-0 cursor-pointer touch-manipulation items-start gap-1.5 sm:gap-3',
                    '[&:has(input:disabled)_*]:opacity-55',
                    monthlySubscribeDisabled && upgradeCycle !== 'monthly'
                      ? 'cursor-not-allowed'
                      : null,
                  )}
                >
                  <input
                    id="billing-upgrade-monthly"
                    name="billing-upgrade-cycle"
                    type="radio"
                    className={cn(
                      'mt-1 size-[0.9375rem] shrink-0 accent-brand-600 sm:size-4',
                      '[&:disabled]:cursor-not-allowed',
                    )}
                    checked={upgradeCycle === 'monthly'}
                    disabled={monthlySubscribeDisabled}
                    onChange={() => setUpgradeCycle('monthly')}
                  />
                  <span
                    className={cn(
                      subscriptionPlanCardClass,
                      'pointer-events-none min-w-0 flex-1',
                      upgradeCycle === 'monthly' ? subscriptionPlanSelected : subscriptionPlanUnselected,
                    )}
                  >
                    <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50 sm:text-base">
                      Monthly
                    </span>
                    <span className="mt-1 block text-sm font-semibold tabular-nums text-brand-800 sm:text-base dark:text-brand-200">
                      {formatInr(pricing.subscription_inr_monthly)}{' '}
                      <span className="font-medium text-zinc-600 dark:text-zinc-400">/ mo</span>
                    </span>
                    <span className="mt-2 block text-xs leading-relaxed text-zinc-600 sm:text-sm dark:text-zinc-400">
                      {subWordsPerCycleFmt} words / month
                    </span>
                    <span className="mt-2 block text-xs leading-relaxed text-zinc-600 sm:text-sm dark:text-zinc-400">
                      Billed monthly
                    </span>
                    {monthlySubscribeDisabled ? (
                      <span className="mt-2 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {subActive && isMonthlySub ? 'Current plan.' : subActive ? 'Use yearly only.' : null}
                      </span>
                    ) : null}
                  </span>
                </label>
                <label
                  htmlFor="billing-upgrade-yearly"
                  className={cn(
                    'flex h-full min-w-0 cursor-pointer touch-manipulation items-start gap-1.5 sm:gap-3',
                    '[&:has(input:disabled)_*]:opacity-55',
                    yearlySubscribeDisabled && upgradeCycle !== 'yearly'
                      ? 'cursor-not-allowed'
                      : null,
                  )}
                >
                  <input
                    id="billing-upgrade-yearly"
                    name="billing-upgrade-cycle"
                    type="radio"
                    className={cn(
                      'mt-1 size-[0.9375rem] shrink-0 accent-brand-600 sm:size-4',
                      '[&:disabled]:cursor-not-allowed',
                    )}
                    checked={upgradeCycle === 'yearly'}
                    disabled={yearlySubscribeDisabled}
                    onChange={() => setUpgradeCycle('yearly')}
                  />
                  <span
                    className={cn(
                      subscriptionPlanCardClass,
                      'pointer-events-none min-w-0 flex-1',
                      upgradeCycle === 'yearly' ? subscriptionPlanSelected : subscriptionPlanUnselected,
                    )}
                  >
                    <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50 sm:text-base">
                      Yearly
                    </span>
                    <span className="mt-1 block text-sm font-semibold tabular-nums text-brand-800 sm:text-base dark:text-brand-200">
                      {formatInr(pricing.subscription_inr_yearly)}{' '}
                      <span className="font-medium text-zinc-600 dark:text-zinc-400">/ yr</span>
                    </span>
                    <span className="mt-2 block text-xs font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
                      {formatInr(yearlyPerMonthRounded)}/mo
                      {yearlySaveVsMonthly > 0 ? (
                        <> - Save {formatInr(yearlySaveVsMonthly)}.</>
                      ) : (
                        <>.</>
                      )}
                    </span>
                    <span className="mt-2 block text-xs leading-relaxed text-zinc-600 sm:text-sm dark:text-zinc-400">
                      Billed yearly
                    </span>
                    {yearlySubscribeDisabled ? (
                      <span className="mt-2 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Yearly active.
                      </span>
                    ) : null}
                  </span>
                </label>
            </fieldset>
          <div className="mx-auto mt-6 w-full max-w-md">
            <button
              type="button"
              disabled={getSubscribeDisabled}
              onClick={() => void startSubscription(upgradeCycle)}
              className={cn(
                authFormPrimaryButtonLightClass,
                'touch-manipulation disabled:pointer-events-none disabled:cursor-not-allowed',
              )}
            >
              {busyPlan === upgradeCycle ? (
                <>
                  <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                  <span>Opening…</span>
                </>
              ) : (
                'Get Subscribe'
              )}
            </button>
          </div>
        </div>
      </section>

      <p className="mx-auto max-w-lg px-1 text-center text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">
        <a
          href="mailto:help@porpin.com"
          className="inline-flex min-h-11 items-center justify-center rounded-md px-2 font-medium text-zinc-700 underline decoration-zinc-400/80 underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
        >
          help@porpin.com
        </a>
      </p>
    </div>
  )
}
