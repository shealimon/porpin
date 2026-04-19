import { useEffect, useState } from 'react'
import { Copy, Gift, Users } from 'lucide-react'
import toast from 'react-hot-toast'

import { apiClient } from '@/api/client'
import {
  appPageDescriptionClass,
  appPageHeaderClass,
  appPageShellClass,
  appPageTitleClass,
} from '@/lib/appPageLayout'
import { cn } from '@/lib/utils'
import { useProfileExtrasStore } from '@/stores/profileExtrasStore'

type ReferralStats = {
  invites_total: number
  pending_signup: number
  verified_pending_use: number
  rewarded_completed: number
  rewarded_cap: number
  total_words_earned_from_referrals: number
}

type ReferralInviteRow = {
  id: string
  status: string
  referee_email_masked: string | null
  ui_message: string
  created_at: string
}

export function InviteFriendsPage() {
  const referralCode = useProfileExtrasStore((s) => s.referralCode)
  const [copied, setCopied] = useState(false)
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [invites, setInvites] = useState<ReferralInviteRow[]>([])
  const [loading, setLoading] = useState(true)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const shareUrl = referralCode ? `${origin}/signup?ref=${referralCode}` : ''

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void Promise.all([
      apiClient.get<ReferralStats>('/referrals/stats'),
      apiClient.get<{ invites: ReferralInviteRow[] }>('/referrals/invites'),
    ])
      .then(([st, inv]) => {
        if (cancelled) return
        setStats(st.data)
        setInvites(inv.data.invites ?? [])
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load referral stats.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
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

  const cap = stats?.rewarded_cap ?? 10
  const done = stats?.rewarded_completed ?? 0

  return (
    <div className={appPageShellClass}>
      <header className={appPageHeaderClass}>
        <h1 className={appPageTitleClass}>Invite friends</h1>
        <p className={cn(appPageDescriptionClass, 'max-w-2xl')}>
          Friends get bonus words when they join. You earn when they verify email, add money, and finish a
          translation—up to {cap} times ({(cap * 10_000).toLocaleString('en-IN')} words max).
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading your referral dashboard…</p>
      ) : stats ? (
        <section
          className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          aria-label="Referral summary"
        >
          <div
            className={cn(
              'rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm',
              'dark:border-zinc-800 dark:bg-zinc-950/80',
            )}
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              <Users className="size-3.5" aria-hidden />
              Invites
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {stats.invites_total.toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Total signups with your link</p>
          </div>
          <div
            className={cn(
              'rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm',
              'dark:border-zinc-800 dark:bg-zinc-950/80',
            )}
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Rewarded
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {done} / {cap}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Successful referral payouts</p>
          </div>
          <div
            className={cn(
              'rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm',
              'dark:border-zinc-800 dark:bg-zinc-950/80',
            )}
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Pending
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {(stats.pending_signup + stats.verified_pending_use).toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {stats.pending_signup} awaiting verify · {stats.verified_pending_use} verified, not paid yet
            </p>
          </div>
          <div
            className={cn(
              'rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm',
              'dark:border-zinc-800 dark:bg-zinc-950/80',
            )}
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Words earned
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {stats.total_words_earned_from_referrals.toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Translation credits from referrals</p>
          </div>
        </section>
      ) : null}

      {referralCode ? (
        <section
          className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5 sm:p-6 dark:border-violet-500/25 dark:bg-violet-950/20"
          aria-labelledby="invite-referral-heading"
        >
          <div className="flex items-start gap-3">
            <Gift className="mt-0.5 size-5 shrink-0 text-violet-600 dark:text-violet-400" aria-hidden />
            <div className="min-w-0 flex-1">
              <h2
                id="invite-referral-heading"
                className="font-display text-lg font-normal tracking-tight text-zinc-900 dark:text-zinc-50"
              >
                Your invite link
              </h2>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="block min-w-0 truncate rounded-lg bg-white/90 px-3 py-2 text-xs text-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200">
                  {shareUrl}
                </code>
                <button
                  type="button"
                  onClick={() => void onCopy()}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-[0.8125rem] font-semibold text-white transition hover:bg-violet-700 sm:text-sm dark:hover:bg-violet-500"
                >
                  <Copy className="size-4" aria-hidden />
                  {copied ? 'Copied' : 'Copy link'}
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div
          className={cn(
            'rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-600',
            'dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400',
          )}
        >
          No invite link is available yet. Open the app again in a moment so your profile can sync, or try
          signing out and back in.
        </div>
      )}

      {invites.length > 0 ? (
        <section className="mt-8" aria-labelledby="invite-list-heading">
          <h2
            id="invite-list-heading"
            className="font-display text-lg font-normal tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            Your invites
          </h2>
          <ul className="mt-4 space-y-3">
            {invites.map((row) => (
              <li
                key={row.id}
                className={cn(
                  'rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm',
                  'dark:border-zinc-800 dark:bg-zinc-950/80',
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {row.referee_email_masked ?? 'Friend'}
                  </span>
                  <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {row.status}
                  </span>
                </div>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">{row.ui_message}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
