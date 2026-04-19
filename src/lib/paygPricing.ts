/**
 * Pay-as-you-go word pricing — single place to change client-side PAYG math.
 * Keep in sync with `backend/app/payg_pricing.py`.
 */

/** Final charge per 100,000 words (matches backend `PAYG_INR_PER_100K_WORDS`). */
export const PAYG_INR_PER_100K_WORDS = 99

const PAYG_QUOTE_MAX_WORDS = 1_000_000

export function clampPaygQuoteWords(wordCount: number): number {
  return Math.min(PAYG_QUOTE_MAX_WORDS, Math.max(0, Math.floor(wordCount)))
}

/** Whole rupees, same formula as backend `estimate_payg_inr`. */
export function estimatePaygInrWholeRupees(words: number): number {
  const w = Math.max(0, Math.floor(words))
  return Math.round((w / 100_000) * PAYG_INR_PER_100K_WORDS)
}

export function formatPaygInrDisplay(
  amount: number,
  opts?: { minFractionDigits?: number; maxFractionDigits?: number },
): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: opts?.minFractionDigits ?? 0,
    maximumFractionDigits: opts?.maxFractionDigits ?? 2,
  }).format(amount)
}
