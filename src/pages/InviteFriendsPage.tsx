import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  Clock3,
  CreditCard,
  Gift,
  Link2,
  Share2,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { apiClient, explainIfLikelyMixedContent } from '@/api/client'
import { apiUrl } from '@/config/api.js'
import { isApiRequestError } from '@/api/axiosError'
import {
  appPageDescriptionClass,
  appPageHeaderClass,
  appPageShellClass,
  appPageTitleClass,
} from '@/lib/appPageLayout'
import { authFormPrimaryButtonLightClass } from '@/lib/authFormStyles'
import { refreshProfileExtras } from '@/lib/syncBackendProfile'
import { cn } from '@/lib/utils'
import { SITE_ORIGIN } from '@/seo/site'
import { useProfileExtrasStore } from '@/stores/profileExtrasStore'

const REFEREE_SIGNUP_BONUS_WORDS = 10_000
const REFERRER_VERIFY_WORDS = 3_000
const REFERRER_PAYMENT_WORDS = 7_000
const REFERRER_TOTAL_WORDS = REFERRER_VERIFY_WORDS + REFERRER_PAYMENT_WORDS

type ReferralStats = {
  invites_total: number
  pending_signup: number
  verified_pending_use: number
  rewarded_completed: number
  /** Referees who reached completed (e.g. first payment); may exceed rewarded_completed if payout hit caps. */
  successful_conversions: number
  rewarded_cap: number
  referrer_max_words_cap: number
  total_words_earned_from_referrals: number
}

type ReferralInviteRow = {
  id: string
  status: string
  referee_email_masked: string | null
  ui_message: string
  created_at: string
}

function inviteStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Awaiting verify'
    case 'verified':
      return 'Awaiting payment'
    case 'completed':
      return 'Done'
    default:
      return status
  }
}

const cardClass = cn(
  'rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6',
  'dark:border-zinc-800 dark:bg-zinc-950/80',
)

export function InviteFriendsPage() {
  const referralCode = useProfileExtrasStore((s) => s.referralCode)
  const [copied, setCopied] = useState(false)
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [invites, setInvites] = useState<ReferralInviteRow[]>([])
  const [loading, setLoading] = useState(true)

  const origin =
    typeof window !== 'undefined'
      ? import.meta.env.PROD || Boolean(import.meta.env.VITE_SITE_ORIGIN?.trim())
        ? SITE_ORIGIN
        : window.location.origin
      : ''
  const shareUrl = referralCode ? `${origin}/signup?ref=${referralCode}` : ''

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        await refreshProfileExtras()
        if (cancelled) return
        const [st, inv] = await Promise.all([
          apiClient.get<ReferralStats>(apiUrl('/api/referrals/stats')),
          apiClient.get<{ invites: ReferralInviteRow[] }>(apiUrl('/api/referrals/invites')),
        ])
        if (cancelled) return
        setStats(st.data)
        setInvites(inv.data.invites ?? [])
      } catch (e: unknown) {
        if (!cancelled) {
          const hint = explainIfLikelyMixedContent(e)
          const msg =
            hint ??
            (isApiRequestError(e)
              ? e.message
              : e instanceof Error
                ? e.message
                : 'Could not load referral stats.')
          toast.error(msg)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const onCopy = () => {
    if (!shareUrl) return
    void navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setCopied(true)
        toast.success('Link copied')
        window.setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => toast.error('Could not copy'))
  }

  const onShareOrCopy = () => {
    if (!shareUrl) return
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      void navigator
        .share({
          title: 'Join me on Porpin',
          text: 'Sign up with my invite link and get bonus words.',
          url: shareUrl,
        })
        .then(() => toast.success('Shared'))
        .catch((err: unknown) => {
          const name = err instanceof Error ? err.name : ''
          if (name === 'AbortError') return
          onCopy()
        })
      return
    }
    onCopy()
  }

  const cap = stats?.rewarded_cap ?? 10
  const done = stats?.rewarded_completed ?? 0
  const wordsCap = stats?.referrer_max_words_cap ?? 100_000
  const theoreticalWordsMax = Math.min(cap * REFERRER_TOTAL_WORDS, wordsCap)

  return (
    <div className={appPageShellClass}>
      <header className={appPageHeaderClass}>
        <h1 className={appPageTitleClass}>Invite friends</h1>
      </header>

      <section className={cardClass} aria-labelledby="invite-hero-heading">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <p className="inline-flex rounded-full border border-zinc-200/90 bg-white/80 px-3 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              Friends get {REFEREE_SIGNUP_BONUS_WORDS.toLocaleString('en-IN')} words on signup
            </p>
            <div>
              <h2
                id="invite-hero-heading"
                className="font-display text-xl font-normal tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl"
              >
                Refer &amp; earn
              </h2>
              <ul
                className={cn(
                  appPageDescriptionClass,
                  'mt-1 max-w-xl list-outside list-disc space-y-1.5 pl-5 marker:text-zinc-400 dark:marker:text-zinc-500',
                )}
              >
                <li>Share your link — you both get extra words as they sign up, verify, and pay.</li>
                <li>
                  First {cap} completed referrals; up to {wordsCap.toLocaleString('en-IN')} words for you in total.
                </li>
              </ul>
            </div>
          </div>
          <div
            className={cn(
              'flex size-14 shrink-0 items-center justify-center rounded-2xl sm:size-16',
              'bg-brand-50/90 dark:bg-brand-950/50',
            )}
            aria-hidden
          >
            <Gift className="size-7 text-brand-600 dark:text-brand-400" />
          </div>
        </div>

        <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            How it works
          </p>
          <ul className="mt-4 space-y-4 text-sm text-zinc-700 dark:text-zinc-300">
            <li className="flex gap-3">
              <span
                className={cn(
                  'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
                  'bg-brand-50/90 dark:bg-brand-950/50',
                )}
              >
                <Link2 className="size-4 text-brand-600 dark:text-brand-400" aria-hidden />
              </span>
              <span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">Share your link</span>
                <span className="mt-0.5 block text-zinc-600 dark:text-zinc-400">Send it to anyone who should join.</span>
              </span>
            </li>
            <li className="flex gap-3">
              <span
                className={cn(
                  'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
                  'bg-brand-50/90 dark:bg-brand-950/50',
                )}
              >
                <UserPlus className="size-4 text-brand-600 dark:text-brand-400" aria-hidden />
              </span>
              <span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">They sign up</span>
                <span className="mt-0.5 block text-zinc-600 dark:text-zinc-400">They get the welcome words.</span>
              </span>
            </li>
            <li className="flex gap-3">
              <span
                className={cn(
                  'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
                  'bg-brand-50/90 dark:bg-brand-950/50',
                )}
              >
                <CreditCard className="size-4 text-brand-600 dark:text-brand-400" aria-hidden />
              </span>
              <span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">You earn in two steps</span>
                <span className="mt-0.5 block text-zinc-600 dark:text-zinc-400">
                  {REFERRER_VERIFY_WORDS.toLocaleString('en-IN')} after they verify, then {REFERRER_PAYMENT_WORDS.toLocaleString('en-IN')} after their first paid plan.
                </span>
              </span>
            </li>
          </ul>
        </div>

        <p className="mt-6 border-t border-zinc-200 pt-6 text-xs leading-relaxed text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          Word credits are for translation only, not cash. No withdrawals or cash refunds.
        </p>

        {referralCode ? (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Your invite link
            </p>
            <div className="mt-3 flex flex-col gap-2 rounded-xl bg-zinc-100/80 p-1 dark:bg-zinc-900/60 sm:flex-row sm:items-center">
              <div className="flex min-h-10 min-w-0 flex-1 items-center gap-2 px-3">
                <Link2 className="size-4 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />
                <code className="min-w-0 truncate text-xs text-zinc-800 dark:text-zinc-200">{shareUrl}</code>
              </div>
              <button
                type="button"
                onClick={() => void onShareOrCopy()}
                className={cn(authFormPrimaryButtonLightClass, 'sm:w-auto sm:shrink-0 sm:self-center')}
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="size-[1.125rem] sm:size-5" aria-hidden />
                    Copied
                  </>
                ) : (
                  <>
                    <Share2 className="size-[1.125rem] sm:size-5" aria-hidden />
                    Share
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'mt-6 rounded-xl border border-dashed border-zinc-200 bg-white/60 px-4 py-6 text-center text-sm text-zinc-600',
              'dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400',
            )}
          >
            No link yet — refresh, or sign out and back in to sync.
          </div>
        )}
      </section>

      {loading ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      ) : stats ? (
        <section
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          aria-label="Referral summary"
        >
          <div className={cardClass}>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              <Users className="size-3.5 text-sky-600 dark:text-sky-400" aria-hidden />
              Invites
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {stats.invites_total.toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {(stats.successful_conversions ?? 0).toLocaleString('en-IN')} finished all steps
            </p>
          </div>
          <div className={cardClass}>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
              Fully rewarded
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {done} / {cap}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Full reward up to {theoreticalWordsMax.toLocaleString('en-IN')} words
            </p>
          </div>
          <div className={cardClass}>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              <Clock3 className="size-3.5 text-amber-600 dark:text-amber-400" aria-hidden />
              In progress
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {(stats.pending_signup + stats.verified_pending_use).toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {stats.pending_signup} not verified yet · {stats.verified_pending_use} waiting on payment
            </p>
          </div>
          <div className={cardClass}>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              <Sparkles className="size-3.5 text-brand-600 dark:text-brand-400" aria-hidden />
              Words you earned
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {stats.total_words_earned_from_referrals.toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Lifetime cap {wordsCap.toLocaleString('en-IN')}</p>
          </div>
        </section>
      ) : null}

      {invites.length > 0 ? (
        <section aria-labelledby="invite-list-heading">
          <h2
            id="invite-list-heading"
            className="font-display text-lg font-normal tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            Invites
          </h2>
          <ul className="mt-4 space-y-3">
            {invites.map((row) => (
              <li key={row.id} className={cardClass}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {row.referee_email_masked ?? 'Friend'}
                  </span>
                  <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {inviteStatusLabel(row.status)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{row.ui_message}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
