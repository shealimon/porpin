const STORAGE_KEY = 'translator_pending_ref'

export function stashReferralCodeFromQuery(search: string): void {
  const ref = new URLSearchParams(search).get('ref')?.trim().toLowerCase()
  if (ref && ref.length >= 3) {
    try {
      sessionStorage.setItem(STORAGE_KEY, ref)
    } catch {
      /* ignore */
    }
  }
}

export function peekPendingReferralCode(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const v = sessionStorage.getItem(STORAGE_KEY)?.trim().toLowerCase()
    return v && v.length >= 3 ? v : null
  } catch {
    return null
  }
}

export function clearPendingReferralCode(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
