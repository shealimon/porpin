import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  CalendarDays,
  Gift,
  HelpCircle,
  Loader2,
  Receipt,
  Sparkles,
  Upload,
  Wallet,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { createRazorpaySubscription } from '@/api/billing'
import { AppTablePagination } from '@/components/ui/AppTablePagination'
import { usePricingConfig } from '@/hooks/usePricingConfig'
import { loadRazorpayScript } from '@/lib/razorpayScript'
import { refreshProfileExtras } from '@/lib/syncBackendProfile'
import {
  appPageHeaderClass,
  appPagePrimaryCtaClass,
  appPageShellClass,
  appPageTitleClass,
} from '@/lib/appPageLayout'
import { DEFAULT_TABLE_PAGE_SIZE } from '@/lib/tablePagination'
import { cn } from '@/lib/utils'
import { formatDate } from '@/utils/format'
import { selectUserBilling, useBillingStore, type BillingTransaction } from '@/stores/billingStore'
import { useProfileExtrasStore } from '@/stores/profileExtrasStore'

function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(amount)
}

function txKindLabel(kind: BillingTransaction['kind']): string {
  return kind === 'included_words' ? 'Included credits' : 'Pay-as-you-go'
}

function txStatusClass(status: BillingTransaction['status']): string {
  if (status === 'succeeded') {
    return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
  }
  if (status === 'pending') {
    return 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'
  }
  return 'bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-200'
}

function ActivityRow({ t }: { t: BillingTransaction }) {
  return (
    <li
      className={cn(
        'rounded-2xl border border-zinc-200/90 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/80',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-zinc-900 dark:text-zinc-100">{txKindLabel(t.kind)}</p>
          {t.fileName ? (
            <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400" title={t.fileName}>
              {t.fileName}
            </p>
          ) : null}
          <p className="mt-2 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
            {formatDate(t.createdAt, 'en-IN')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {t.words.toLocaleString('en-IN')} words
          </p>
          <p className="mt-1 text-sm tabular-nums text-zinc-600 dark:text-zinc-300">
            {t.kind === 'included_words' ? 'No extra charge' : formatInr(t.amountInr)}
          </p>
          <span
            className={cn(
              'mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize',
              txStatusClass(t.status),
            )}
          >
            {t.status}
          </span>
        </div>
      </div>
    </li>
  )
}

export function BillingPage() {
  const { pricing } = usePricingConfig()
  const freeCredits = useProfileExtrasStore((s) => s.freeCredits)
  const referralBonus = useProfileExtrasStore((s) => s.referralBonusWords)
  const subActive = useProfileExtrasStore((s) => s.subscriptionActive)
  const subCredits = useProfileExtrasStore((s) => s.subscriptionCredits)
  const subExpiry = useProfileExtrasStore((s) => s.subscriptionExpiry)
  const transactions = useBillingStore((s) => selectUserBilling(s).transactions)

  const [txPage, setTxPage] = useState(1)
  const [subBusy, setSubBusy] = useState(false)
  const txPageSize = DEFAULT_TABLE_PAGE_SIZE
  const totalTx = transactions.length
  const txTotalPages = Math.max(1, Math.ceil(totalTx / txPageSize) || 1)

  const pagedTransactions = useMemo(() => {
    const start = (txPage - 1) * txPageSize
    return transactions.slice(start, start + txPageSize)
  }, [transactions, txPage, txPageSize])

  useEffect(() => {
    if (txPage > txTotalPages) setTxPage(txTotalPages)
  }, [txPage, txTotalPages])

  useEffect(() => {
    void refreshProfileExtras()
  }, [])

  const startSubscription = useCallback(async () => {
    setSubBusy(true)
    try {
      await loadRazorpayScript()
      const start = await createRazorpaySubscription()
      const Ctor = window.Razorpay
      if (!Ctor) {
        throw new Error('Razorpay SDK missing after load.')
      }
      const rzp = new Ctor({
        key: start.key_id,
        subscription_id: start.subscription_id,
        name: 'Porpin',
        description: `Monthly · ${formatInr(pricing.subscription_inr_monthly)}`,
        handler() {
          void refreshProfileExtras()
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
  }, [pricing.subscription_inr_monthly])

  const effFreePool = freeCredits + referralBonus
  const subWordsPerCycle = pricing.subscription_words_per_cycle.toLocaleString('en-IN')

  return (
    <div className={cn(appPageShellClass, 'space-y-10 sm:space-y-12')}>
      <header className={appPageHeaderClass}>
        <h1 className={appPageTitleClass}>Billing</h1>
      </header>

      {/* How it works */}
      <section
        aria-labelledby="how-heading"
        className={cn(
          'rounded-2xl border border-zinc-200/90 bg-zinc-50/90 p-5 sm:p-6',
          'dark:border-zinc-800 dark:bg-zinc-900/40',
        )}
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="size-5 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
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
              <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
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
              <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
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
              <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                After included words run out, you pay per job when you confirm the estimate on Home — not from this page.
              </p>
            </div>
          </li>
        </ol>
      </section>

      {/* Balances */}
      <section aria-labelledby="balances-heading">
        <h2
          id="balances-heading"
          className="font-display text-lg font-normal tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          Your word balance
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Pools that apply before pay-as-you-go. Server totals are authoritative if something looks off — refresh or
          sign in again.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div
            className={cn(
              'rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm',
              'dark:border-zinc-800 dark:bg-zinc-950/80',
            )}
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              <Wallet className="size-3.5" aria-hidden />
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
              'rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm',
              'dark:border-zinc-800 dark:bg-zinc-950/80',
            )}
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              <CalendarDays className="size-3.5" aria-hidden />
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
          'rounded-2xl border p-5 sm:p-6',
          'border-brand-200 bg-brand-50/70 dark:border-brand-500/35 dark:bg-brand-950/30',
        )}
      >
        <h2 id="sub-heading" className="font-display text-lg font-normal tracking-tight text-zinc-900 dark:text-zinc-50">
          Monthly plan
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
          <li className="flex gap-2">
            <span className="text-brand-600 dark:text-brand-400" aria-hidden>
              ·
            </span>
            <span>
              <strong>{subWordsPerCycle}</strong> words per billing cycle
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-brand-600 dark:text-brand-400" aria-hidden>
              ·
            </span>
            <span>
              <strong>{formatInr(pricing.subscription_inr_monthly)}</strong> / month via Razorpay
            </span>
          </li>
        </ul>
        <button
          type="button"
          disabled={subBusy}
          onClick={() => void startSubscription()}
          className={cn(appPagePrimaryCtaClass, 'mt-5 min-h-[44px] sm:min-h-10')}
        >
          {subBusy ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Opening checkout…
            </>
          ) : (
            <>
              Subscribe for {formatInr(pricing.subscription_inr_monthly)}/month
              <ArrowUpRight className="size-4" aria-hidden />
            </>
          )}
        </button>
        <details className="mt-4 rounded-lg border border-brand-200/60 bg-white/50 p-3 text-xs text-zinc-600 dark:border-brand-500/20 dark:bg-zinc-950/40 dark:text-zinc-400">
          <summary className="cursor-pointer font-medium text-zinc-700 outline-none dark:text-zinc-300">
            Developer: Razorpay setup
          </summary>
          <p className="mt-2 leading-relaxed">
            Production needs <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">RAZORPAY_*</code> env vars on
            the API and a matching plan (e.g. ₹{pricing.subscription_inr_monthly.toLocaleString('en-IN')}) in Razorpay.
          </p>
        </details>
      </section>

      {/* Local activity */}
      <section aria-labelledby="activity-heading">
        <div className="flex items-start gap-2">
          <Receipt className="mt-0.5 size-5 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
          <div className="min-w-0">
            <h2
              id="activity-heading"
              className="font-display text-lg font-normal tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              Recent confirmations
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Jobs you confirmed in <strong className="font-medium text-zinc-800 dark:text-zinc-200">this browser</strong>
              . For full account history, rely on your email receipts and server records.
            </p>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div
            className={cn(
              'mt-5 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-5 py-10 text-center',
              'dark:border-zinc-700 dark:bg-zinc-900/35',
            )}
          >
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Nothing logged here yet. When you confirm a translation from{' '}
              <strong className="font-semibold text-zinc-800 dark:text-zinc-200">Home</strong>, it will show up in this
              list.
            </p>
          </div>
        ) : (
          <>
            <ul className="mt-5 space-y-3">
              {pagedTransactions.map((t) => (
                <ActivityRow key={t.id} t={t} />
              ))}
            </ul>
            <AppTablePagination
              page={txPage}
              totalItems={totalTx}
              pageSize={txPageSize}
              onPageChange={setTxPage}
              className="border-zinc-200/80 dark:border-zinc-800"
            />
          </>
        )}
      </section>

      <p className="text-center text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">
        Invoice questions? Email support from the address on your account — we aim to reply within one business day
        (IST).
      </p>
    </div>
  )
}
