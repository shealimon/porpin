/** India-only mobile: stored in `profiles.mobile` as E.164 (+91…). */

export const IN_DIAL = '+91'
export const IN_CODE_LABEL = 'IN'

const MOBILE_MAX_LEN = 32

/**
 * Read stored value into the national (10-digit) part for the form.
 * Expects +91 for normal saves; other shapes lose the prefix and keep digits.
 */
export function parseInMobileToLocal(stored: string | null | undefined): string {
  const t = (stored ?? '').trim()
  if (!t) return ''
  if (t.startsWith(IN_DIAL)) {
    return t.slice(IN_DIAL.length).replace(/\D/g, '')
  }
  if (t.startsWith('+')) {
    return t.replace(/^\++/, '').replace(/\D/g, '')
  }
  return t.replace(/\D/g, '')
}

export function formatInMobileForApi(localDigits: string): string {
  const digits = localDigits.replace(/\D/g, '')
  if (!digits) return ''
  return `${IN_DIAL}${digits}`.slice(0, MOBILE_MAX_LEN)
}
