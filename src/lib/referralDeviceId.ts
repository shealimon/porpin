const STORAGE_KEY = 'translator_referral_device_id'

/** Stable per-browser id for referral abuse signals (sent with /referrals/claim). */
export function getReferralDeviceId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = localStorage.getItem(STORAGE_KEY)?.trim()
    if (!id || id.length < 8) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`
      localStorage.setItem(STORAGE_KEY, id)
    }
    return id
  } catch {
    return ''
  }
}
