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
  /* Mobile: 16px text avoids iOS zoom-on-focus; taller field for touch targets. */
  'box-border h-11 min-h-11 rounded-md border border-zinc-300 bg-white py-0 pl-3 pr-3 text-base leading-normal sm:h-9 sm:min-h-9 sm:text-sm sm:leading-5',
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

/** Black pill CTA on light auth cards — same shape as landing “Start Free”. */
export const authFormPrimaryButtonLightClass = cn(
  'box-border inline-flex w-full min-w-0 items-center justify-center gap-2 rounded-full border-0',
  '!h-auto min-h-14 px-10 text-base font-semibold whitespace-normal',
  '!bg-stone-900 !text-white shadow-lg !shadow-stone-900/15',
  'transition hover:!bg-stone-800 active:scale-[0.98]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
  'disabled:opacity-55 disabled:active:scale-100',
  'sm:min-h-[3.75rem] sm:px-12 sm:text-lg',
)

/** Outer scroll shell: same canvas as landing below the public header (no floating-card gutters). */
export const authLightMobilePageShellClass = cn(
  'phone:bg-background phone:justify-start phone:px-0 phone:py-0 phone:pt-0 phone:pb-0',
)

/** Card becomes an edge-to-edge sheet on small screens. */
export const authLightMobileCardClass = cn(
  'phone:flex-1 phone:min-h-0 phone:w-full phone:max-w-full phone:rounded-none phone:border-0 phone:shadow-none phone:ring-0 phone:bg-white',
)

/** Horizontal safe-area inset only (pair with pt/pb; avoids double horizontal padding). */
export const authLightMobileContentInsetClass = cn(
  'phone:pl-[max(1rem,env(safe-area-inset-left))] phone:pr-[max(1rem,env(safe-area-inset-right))]',
)

/** Header / hero copy: app-style left alignment under `authLightMobileContentInsetClass`. */
export const authLightMobileHeaderAlignClass = cn(
  'phone:items-start phone:text-left',
)

/** Title row (icon + heading): left on mobile, centered from `sm`. */
export const authLightMobileTitleRowClass = cn('phone:justify-start')

/** Duplicated mark in the card: hide on mobile when the public header already shows the brand. */
export const authLightMobileHideCardLogoClass = 'phone:hidden'
