import { cn } from '@/lib/utils'

/** Shared column width and vertical rhythm for Account, Billing, History, etc. */
export const appPageShellClass = cn(
  'mx-auto w-full min-w-0 max-w-3xl space-y-8 sm:space-y-10',
)

export const appPageHeaderClass = 'min-w-0'

export const appPageTitleClass = cn(
  'font-display mt-1.5 text-[clamp(1.5rem,4.5vw,2rem)] font-normal tracking-tight text-zinc-900 dark:text-zinc-50',
)

export const appPageDescriptionClass = cn(
  'mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-[0.9375rem]',
)

/** Primary actions in Account / Billing / History (toolbar links, save, upgrade). */
export const appPagePrimaryCtaClass = cn(
  'inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg',
  'bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm no-underline visited:no-underline',
  'transition hover:bg-brand-700 active:scale-[0.98]',
  'dark:bg-brand-600 dark:hover:bg-brand-500',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2',
  'focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950',
  'touch-manipulation disabled:pointer-events-none disabled:opacity-60',
)
