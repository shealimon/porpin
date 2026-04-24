import { cn } from '@/lib/utils'

/** Shared light-on-dark inputs for login / signup (Voltix shell). */
export const authFormFieldClass = cn(
  'h-11 rounded-lg border border-white/12 bg-zinc-950/50 px-3.5 text-sm text-zinc-50 shadow-none',
  'placeholder:text-zinc-500',
  'transition-colors hover:border-white/18',
  'focus-visible:border-voltix-lime/55 focus-visible:ring-2 focus-visible:ring-voltix-lime/25',
)

/** Smaller fields + symmetric pl/pr (pairs with shared `Input` component). */
export const authFormFieldCompactClass = cn(
  authFormFieldClass,
  'box-border h-9 min-h-9 rounded-md py-0 pl-3 pr-3 text-[0.8125rem] leading-5 sm:text-sm sm:leading-5',
)

/** Lime CTA on dark auth cards (login / signup / forgot). */
export const authFormPrimaryButtonClass = cn(
  'h-10 w-full rounded-md border-0 text-[0.8125rem] font-semibold shadow-lg shadow-[#c8ff00]/15 sm:text-sm',
  '!bg-[#c8ff00] !text-zinc-950',
  'hover:!bg-[#dfff7a] hover:brightness-[1.02]',
  'focus-visible:ring-2 focus-visible:ring-[#c8ff00]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
  'disabled:opacity-55',
)

export const authFormLabelClass =
  'text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-zinc-400'

/** Light marketing shell (login / signup / forgot) — white field, neutral gray border. */
export const authFormFieldCompactLightClass = cn(
  'box-border h-9 min-h-9 rounded-md border border-zinc-300 bg-white py-0 pl-3 pr-3 text-[0.8125rem] leading-5 sm:text-sm sm:leading-5',
  'text-zinc-900 shadow-sm placeholder:text-zinc-400',
  'transition-colors hover:border-zinc-400',
  'focus-visible:border-zinc-500 focus-visible:ring-2 focus-visible:ring-zinc-400/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
)

export const authFormLabelLightClass =
  'text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-zinc-500'

/**
 * Light password field: suppress browser-native “show password” on Windows — see `index.css`
 * `.auth-password-no-native-reveal`.
 */
export const authFormFieldPasswordLightClass = cn(
  authFormFieldCompactLightClass,
  'auth-password-no-native-reveal',
)

/** Black CTA on light auth cards (login / signup / forgot). */
export const authFormPrimaryButtonLightClass = cn(
  'h-10 w-full rounded-md border-0 text-[0.8125rem] font-semibold shadow-md sm:text-sm',
  '!bg-zinc-950 !text-white',
  'hover:!bg-zinc-800',
  'focus-visible:ring-2 focus-visible:ring-zinc-950/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
  'disabled:opacity-55',
)
