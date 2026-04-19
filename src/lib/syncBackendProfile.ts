import toast from 'react-hot-toast'

import { apiClient } from '@/api/client'
import { getReferralDeviceId } from '@/lib/referralDeviceId'
import { clearPendingReferralCode, peekPendingReferralCode } from '@/lib/referralCapture'
import { useProfileExtrasStore } from '@/stores/profileExtrasStore'

export type SyncProfileResponse = {
  id: string
  email: string | null
  plan: string
  credits_inr_balance?: number
  free_credits?: number
  subscription_active?: boolean
  subscription_credits?: number
  subscription_expiry?: string | null
  first_name?: string | null
  last_name?: string | null
  mobile?: string | null
  city?: string | null
  country?: string | null
  referral_code?: string | null
  referral_bonus_words?: number
  referral_words_earned_total?: number
  referred_by_user_id?: string | null
}

type ClaimReferralResponse = {
  outcome:
    | 'credited'
    | 'already_attributed'
    | 'invalid_code'
    | 'self_referral'
    | 'email_blocked'
    | 'device_reused'
  words_credited_to_referrer: number
}

export type SyncBackendProfileOptions = {
  /**
   * `soft` (default): no throw, no toast on failure; returns false if the API is down.
   * `strict`: error toast + throw.
   */
  behavior?: 'soft' | 'strict'
}

export function applySyncProfileResponse(data: SyncProfileResponse): void {
  useProfileExtrasStore.getState().applyFromSync({
    referral_code: data.referral_code,
    referral_bonus_words: data.referral_bonus_words,
    referral_words_earned_total: data.referral_words_earned_total,
    referred_by_user_id: data.referred_by_user_id,
    credits_inr_balance: data.credits_inr_balance,
    free_credits: data.free_credits,
    subscription_active: data.subscription_active,
    subscription_credits: data.subscription_credits,
    subscription_expiry: data.subscription_expiry,
  })
}

/** POST /api/me/sync-profile and map referral fields into the store. Silent failure (e.g. tab restore). */
export async function refreshProfileExtras(): Promise<void> {
  try {
    const { data } = await apiClient.post<SyncProfileResponse>('/me/sync-profile')
    applySyncProfileResponse(data)
  } catch {
    /* ignore */
  }
}

/**
 * Ensures `public.profiles` exists via FastAPI (requires token already in auth store).
 * Applies pending `?ref=` code once (`/api/referrals/claim`) after sync.
 * @returns true if sync (and optional claim) succeeded.
 */
export async function syncBackendProfile(
  options?: SyncBackendProfileOptions,
): Promise<boolean> {
  const behavior = options?.behavior ?? 'soft'
  try {
    const { data } = await apiClient.post<SyncProfileResponse>('/me/sync-profile')
    applySyncProfileResponse(data)

    const code = peekPendingReferralCode()
    if (code) {
      try {
        const claimRes = await apiClient.post<ClaimReferralResponse>('/referrals/claim', {
          code,
          device_id: getReferralDeviceId() || undefined,
        })
        if (claimRes.data.outcome !== 'invalid_code') {
          clearPendingReferralCode()
        }
        const { data: again } = await apiClient.post<SyncProfileResponse>('/me/sync-profile')
        applySyncProfileResponse(again)
      } catch {
        /* keep pending ref for a later retry */
      }
    }
    return true
  } catch {
    if (behavior === 'strict') {
      toast.error(
        'Could not sync your account with the server. Start the backend (uvicorn) and try signing in again, or uploads may fail.',
        { duration: 8000 },
      )
      throw new Error('sync-profile failed')
    }
    return false
  }
}
