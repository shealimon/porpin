/// <reference types="vite/client" />

declare module "*.hbs?raw" {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  /** Public site URL for canonicals, JSON-LD, and OG (no trailing slash), e.g. https://www.porpin.com */
  readonly VITE_SITE_ORIGIN?: string
  /** Supabase project URL (Dashboard → API), e.g. https://xxxx.supabase.co */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase anon public key (Dashboard → API) */
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_API_BASE_URL?: string
  /** Full backend origin for /upload and /job when not using Vite proxy, e.g. http://127.0.0.1:8000 */
  readonly VITE_BACKEND_ORIGIN?: string
  /** Razorpay Key ID (public) for Standard Checkout — must match RAZORPAY_KEY_ID on the API */
  readonly VITE_RAZORPAY_KEY_ID?: string
  /** Optional greeting name, e.g. `VITE_USER_DISPLAY_NAME=Alex` */
  readonly VITE_USER_DISPLAY_NAME?: string
  /** Optional pricing UI overrides when API is unavailable */
  readonly VITE_TRIAL_WORD_LIMIT?: string
  readonly VITE_TRIAL_DAYS?: string
  /** Free tier word credits shown in UI when API is unavailable (default matches backend). */
  readonly VITE_FREE_CREDITS_WORDS?: string
  readonly VITE_RATE_INR_PER_10000?: string
  readonly VITE_MIN_CHARGE_INR?: string
  readonly VITE_MAX_UPLOAD_MB?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
