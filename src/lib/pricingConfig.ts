/**
 * Merged server + env fallbacks for pricing UI (plans, subscription, marketing rates).
 * Pay-as-you-go **word charges** (upload estimate) live in `paygPricing.ts` — aligned with `app/payg_pricing.py`.
 */

/** Must match backend `app.billing_constants.FREE_CREDITS_INITIAL`. */
export const FREE_CREDITS_INITIAL_WORDS = 10_000 as const

export type PublicPricingConfig = {
  free_credits_words: number
  subscription_inr_monthly: number
  /** Annual subscription list price (marketing + checkout copy; billing may still be monthly-only). */
  subscription_inr_yearly: number
  subscription_words_per_cycle: number
  rate_inr_per_10000_words: number
  minimum_charge_inr: number
  /** When true, API requires payment before PAYG jobs run. */
  payg_checkout_required: boolean
  max_upload_file_mb: number
  currency: string
  trust_payment_copy: string
  free_tier_label: string
  payg_label: string
  subscription_label: string
}

export const FALLBACK_PRICING: PublicPricingConfig = {
  free_credits_words: FREE_CREDITS_INITIAL_WORDS,
  subscription_inr_monthly: 999,
  subscription_inr_yearly: 9_990,
  subscription_words_per_cycle: 2_000_000,
  rate_inr_per_10000_words: 9.9,
  minimum_charge_inr: 5,
  payg_checkout_required: false,
  max_upload_file_mb: 0,
  currency: 'INR',
  trust_payment_copy:
    'Payments are processed over encrypted connections. We never store full card numbers.',
  free_tier_label: 'Free credits',
  payg_label: 'Pay-as-you-go',
  subscription_label: 'Monthly',
}

function envNum(key: string, fallback: number): number {
  const raw = (import.meta.env as Record<string, string | undefined>)[key]
  if (raw === undefined || raw === '') return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

export function envPricingOverrides(): Partial<PublicPricingConfig> {
  return {
    free_credits_words: envNum('VITE_FREE_CREDITS_WORDS', FALLBACK_PRICING.free_credits_words),
    subscription_inr_monthly: envNum(
      'VITE_SUBSCRIPTION_INR',
      FALLBACK_PRICING.subscription_inr_monthly,
    ),
    subscription_inr_yearly: envNum(
      'VITE_SUBSCRIPTION_INR_YEARLY',
      FALLBACK_PRICING.subscription_inr_yearly,
    ),
    rate_inr_per_10000_words: envNum(
      'VITE_RATE_INR_PER_10000',
      FALLBACK_PRICING.rate_inr_per_10000_words,
    ),
    minimum_charge_inr: envNum(
      'VITE_MIN_CHARGE_INR',
      FALLBACK_PRICING.minimum_charge_inr,
    ),
    max_upload_file_mb: envNum(
      'VITE_MAX_UPLOAD_MB',
      FALLBACK_PRICING.max_upload_file_mb,
    ),
  }
}

/** Human-readable upload size for marketing / UI (server returns 0 = no byte cap). */
export function uploadSizeBlurb(cfg: PublicPricingConfig): string {
  if (cfg.max_upload_file_mb > 0) {
    return `${cfg.max_upload_file_mb} MB`
  }
  return 'large documents (no fixed server cap)'
}

export function mergePricingConfig(server?: Partial<PublicPricingConfig>): PublicPricingConfig {
  const env = envPricingOverrides()
  return {
    ...FALLBACK_PRICING,
    ...env,
    ...server,
    subscription_words_per_cycle:
      server?.subscription_words_per_cycle ?? FALLBACK_PRICING.subscription_words_per_cycle,
    trust_payment_copy: server?.trust_payment_copy ?? FALLBACK_PRICING.trust_payment_copy,
    free_tier_label: server?.free_tier_label ?? FALLBACK_PRICING.free_tier_label,
    payg_label: server?.payg_label ?? FALLBACK_PRICING.payg_label,
    subscription_label: server?.subscription_label ?? FALLBACK_PRICING.subscription_label,
    payg_checkout_required:
      server?.payg_checkout_required ?? FALLBACK_PRICING.payg_checkout_required,
  }
}
