import { create } from 'zustand'

/** Server-backed profile fields not in auth persist slice. */
export type SyncProfileExtras = {
  /** Server ``profiles.plan`` (e.g. free, payg, monthly, yearly). */
  plan: string
  referralCode: string | null
  referralBonusWords: number
  referralWordsEarnedTotal: number
  referredByUserId: string | null
  freeCredits: number
  subscriptionActive: boolean
  subscriptionCredits: number
  subscriptionExpiry: string | null
}

type ProfileExtrasState = SyncProfileExtras & {
  applyFromSync: (payload: {
    plan?: string | null
    referral_code?: string | null
    referral_bonus_words?: number
    referral_words_earned_total?: number
    referred_by_user_id?: string | null
    free_credits?: number
    subscription_active?: boolean
    subscription_credits?: number
    subscription_expiry?: string | null
  }) => void
  reset: () => void
}

const empty: SyncProfileExtras = {
  plan: 'free',
  referralCode: null,
  referralBonusWords: 0,
  referralWordsEarnedTotal: 0,
  referredByUserId: null,
  freeCredits: 0,
  subscriptionActive: false,
  subscriptionCredits: 0,
  subscriptionExpiry: null,
}

export const useProfileExtrasStore = create<ProfileExtrasState>((set) => ({
  ...empty,
  applyFromSync: (payload) =>
    set({
      plan:
        typeof payload.plan === 'string' && payload.plan.trim()
          ? payload.plan.trim()
          : 'free',
      referralCode: payload.referral_code ?? null,
      referralBonusWords: Math.max(0, Number(payload.referral_bonus_words ?? 0)),
      referralWordsEarnedTotal: Math.max(
        0,
        Number(payload.referral_words_earned_total ?? 0),
      ),
      referredByUserId: payload.referred_by_user_id ?? null,
      freeCredits: Math.max(0, Number(payload.free_credits ?? 0)),
      subscriptionActive: Boolean(payload.subscription_active),
      subscriptionCredits: Math.max(0, Number(payload.subscription_credits ?? 0)),
      subscriptionExpiry: payload.subscription_expiry ?? null,
    }),
  reset: () => set({ ...empty }),
}))
